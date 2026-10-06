import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { SYSTEM_FLOORS, compareFloors, formatFloor } from "@/lib/floors";
import { auditLog } from "@/lib/logger";
import { resolveKioskUser } from "@/lib/auth-helpers";
import { publishChatEvent } from "@/lib/chat-events";
import { verifyUploadClaim } from "@/lib/upload-claim";

export const dynamic = "force-dynamic";

type TypingEntry = { isTyping: boolean; expiresAt: number };
const typingStore: Map<string, TypingEntry> = ((globalThis as any).__halktvKioskTypingStore ||= new Map<string, TypingEntry>());

function typingKey(viewerId: string, partnerId: string) {
  return `${viewerId}:${partnerId}`;
}

function setTyping(senderId: string, recipientId: string, isTyping: boolean) {
  for (const [key, entry] of typingStore) if (entry.expiresAt < Date.now()) typingStore.delete(key);
  publishChatEvent(recipientId, { kind: "typing", partnerId: senderId });
  const key = typingKey(recipientId, senderId);
  if (!isTyping) {
    typingStore.delete(key);
    return;
  }
  typingStore.set(key, { isTyping: true, expiresAt: Date.now() + 4500 });
}

function getTyping(viewerId: string, partnerId: string) {
  const key = typingKey(viewerId, partnerId);
  const entry = typingStore.get(key);
  if (!entry) return false;
  if (entry.expiresAt < Date.now()) {
    typingStore.delete(key);
    return false;
  }
  return entry.isTyping;
}

export function getFloorInfo(departmentName?: string | null): { floor: string; floorLabel: string } {
  if (!departmentName) return { floor: "", floorLabel: "Kat belirtilmemiş" };
  const d = departmentName.toLowerCase();
  if (d.includes("lobi") || d.includes("danışma") || d.includes("danisma") || d.includes("giriş") || d.includes("giris")) {
    return { floor: "Giriş Kat", floorLabel: "Giriş Kat (Lobi)" };
  }
  if (d.includes("reji") || d.includes("stüdyo") || d.includes("studyo")) {
    return { floor: "2. Kat", floorLabel: "2. Kat (Reji)" };
  }
  if (d.includes("web") || d.includes("youtube") || d.includes("sosyal")) {
    return { floor: "3. Kat", floorLabel: "3. Kat (Web ve Youtube Katı)" };
  }
  if (d.includes("muhasebe") || d.includes("insan") || d.includes("ik") || d.includes("finans") || d.includes("idari") || d.includes("yönetim")) {
    return { floor: "5. Kat", floorLabel: "5. Kat (Muhasebe ve İnsan Kaynakları)" };
  }
  // Departman tablosunda kat bilgisi yoksa varsayım yapma.
  return { floor: "", floorLabel: "Kat belirtilmemiş" };
}

async function resolveKioskUserId(url?: URL, body?: any): Promise<string | null> {
  return (await resolveKioskUser())?.id ?? null;
}


export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const userId = await resolveKioskUserId(url);
    const isContactsOnly = url.searchParams.get("contacts_only") === "true";

    if (!userId) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    // Kullanıcının kendi aktifliğini tazele
    if (userId) {
      await prisma.user.update({
        where: { id: userId },
        data: { lastActiveAt: new Date() },
      }).catch(() => {});

      // Only log KIOSK_CONNECTED once per 5 minutes to avoid spam
      const hostname = url.searchParams.get("hostname") ?? undefined;
      const username = url.searchParams.get("username") ?? undefined;
      const recentLog = await prisma.auditLog.findFirst({
        where: {
          actorId: userId,
          action: "KIOSK_CONNECTED",
          createdAt: { gte: new Date(Date.now() - 5 * 60 * 1000) },
        },
      }).catch(() => null);

      if (!recentLog) {
        await auditLog({
          actorId: userId,
          action: "KIOSK_CONNECTED",
          entityType: "User",
          entityId: userId,
          meta: { hostname, username },
        }).catch(() => {});
      }
    }

    // 1. KİŞİ LİSTESİ ÇEKME
    if (url.searchParams.get("contacts_only") === "true") {
      const mode = url.searchParams.get("mode"); // "it" | "staff" | null
      const itRoles = ["IT_AGENT", "TEKNIK_MUDUR", "SUPER_ADMIN", "TEKNIK_YONETMEN"];

      let roleCondition: any = {};
      if (mode === "it") {
        roleCondition = { role: { in: itRoles }, showInLiveChat: true };
      } else if (mode === "staff") {
        roleCondition = { role: { notIn: itRoles } };
      }

      const [meUser, personnel, myBlocks, blockedMeList, departments, unreadGroups] = await Promise.all([
        userId
          ? prisma.user.findUnique({
              where: { id: userId },
              select: { directMessagesEnabled: true },
            })
          : null,
        prisma.user.findMany({
          where: {
            status: "ACTIVE",
            ...(userId ? { id: { not: userId } } : {}),
            ...roleCondition,
          },
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            role: true,
            title: true,
            status: true,
            lastActiveAt: true,
            directMessagesEnabled: true,
            department: { select: { id: true, name: true, floor: true } },
            computers: { select: { name: true }, take: 1 },
            ...(userId
              ? {
                  dmSent: {
                    where: { recipientId: userId, deletedByRecipient: false },
                    orderBy: { createdAt: "desc" },
                    take: 1,
                    select: { body: true, createdAt: true, senderId: true, isRead: true, attachmentType: true, archivedByRecipient: true },
                  },
                  dmReceived: {
                    where: { senderId: userId, deletedBySender: false },
                    orderBy: { createdAt: "desc" },
                    take: 1,
                    select: { body: true, createdAt: true, senderId: true, isRead: true, attachmentType: true, archivedBySender: true },
                  },
                }
              : {}),
          },
        }),
        userId
          ? prisma.userBlock.findMany({
              where: { blockerId: userId },
              select: { blockedId: true },
            })
          : [],
        userId
          ? prisma.userBlock.findMany({
              where: { blockedId: userId },
              select: { blockerId: true },
            })
          : [],
        prisma.department.findMany({
          orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
          select: { id: true, name: true, floor: true },
        }),
        userId
          ? prisma.directMessage.groupBy({
              by: ["senderId"],
              where: { recipientId: userId, isRead: false, deletedByRecipient: false },
              _count: true,
            })
          : [],
      ]);

      const myBlockedSet = new Set(myBlocks.map((b) => b.blockedId));
      const blockedMeSet = new Set(blockedMeList.map((b) => b.blockerId));
      const unreadMap = new Map((unreadGroups as any[]).map((g) => [g.senderId, g._count]));
      const now = new Date();

      // Bellek içi hızlı eşleştirme (N+1 SQL sorgusu tamamen ortadan kaldırıldı)
      const contactsWithMessages = personnel.map((staff: any) => {
        let lastMsg = null;
        if (userId) {
          const lastSent = staff.dmSent?.[0];
          const lastReceived = staff.dmReceived?.[0];
          if (lastSent && lastReceived) {
            lastMsg = new Date(lastSent.createdAt) > new Date(lastReceived.createdAt) ? lastSent : lastReceived;
          } else {
            lastMsg = lastSent || lastReceived || null;
          }
        }
          const unreadCount = unreadMap.get(staff.id) || 0;
          const isArchived = Boolean(lastMsg && (lastMsg.senderId === userId
            ? lastMsg.archivedBySender
            : lastMsg.archivedByRecipient));

          // Online durumu (son 2 dakika aktiflik)
          const isOnline = staff.lastActiveAt
            ? now.getTime() - new Date(staff.lastActiveAt).getTime() < 180000
            : false;

          let lastSeenText = "Çevrimdışı";
          if (isOnline) {
            lastSeenText = "Çevrimiçi";
          } else if (staff.lastActiveAt) {
            const seenDate = new Date(staff.lastActiveAt);
            const isToday = seenDate.toDateString() === now.toDateString();
            const timeStr = seenDate.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
            lastSeenText = isToday ? `Son görülme ${timeStr}` : `Son görülme ${seenDate.toLocaleDateString("tr-TR", { day: "numeric", month: "short" })}`;
          }

          const floorInfo = getFloorInfo(staff.department?.name);
          const staffFloor = formatFloor(staff.department?.floor || floorInfo.floor);
          const staffFloorLabel = staff.department?.floor ? `${formatFloor(staff.department.floor)} (${staff.department.name})` : floorInfo.floorLabel;

          return {
            id: staff.id,
            name: staff.name || staff.email,
            email: staff.email,
            image: staff.image,
            role: staff.role,
            // Kiosk her zaman profil ünvanını gösterir; rol adı ünvan yerine geçmez.
            title: staff.title,
            department: staff.department?.name || null,
            floor: staffFloor,
            floorLabel: staffFloorLabel,
            computerName: staff.computers?.[0]?.name || null,
            isOnline,
            lastActiveAt: staff.lastActiveAt ? staff.lastActiveAt.toISOString() : null,
            lastSeenText,
            directMessagesEnabled: staff.directMessagesEnabled,
            isBlocked: myBlockedSet.has(staff.id),
            isBlockedBy: blockedMeSet.has(staff.id),
            isArchived,
            unread: unreadCount,
            lastMessage: lastMsg
              ? {
                  body: lastMsg.attachmentType === "image" ? "📷 Görsel" : lastMsg.attachmentType === "file" ? "📎 Dosya" : lastMsg.body,
                  createdAt: lastMsg.createdAt.toISOString(),
                  isMine: lastMsg.senderId === userId,
                }
              : null,
          };
        });

      // Sıralama Önceliği:
      // 1. Okunmamış mesajı olanlar en üstte
      // 2. Çevrimiçi olanlar (isOnline === true) yukarıda!
      // 3. Son mesajı olanlar
      // 4. İsim sırasına göre
      contactsWithMessages.sort((a, b) => {
        if (a.unread > 0 && b.unread === 0) return -1;
        if (b.unread > 0 && a.unread === 0) return 1;

        if (a.isOnline && !b.isOnline) return -1;
        if (!a.isOnline && b.isOnline) return 1;

        if (a.lastMessage && b.lastMessage) {
          return new Date(b.lastMessage.createdAt).getTime() - new Date(a.lastMessage.createdAt).getTime();
        }
        if (a.lastMessage) return -1;
        if (b.lastMessage) return 1;

        return a.name.localeCompare(b.name, "tr");
      });

      // Departman filtreleri (Sadece Departman Adları - kullanıcı isteği)
      const deptChips: Array<{ id: string; label: string; floor?: string }> = departments.map((d) => ({
        id: d.name,
        label: d.name,
        floor: d.floor ? formatFloor(d.floor) : undefined,
      }));

      deptChips.sort((a, b) => a.label.localeCompare(b.label, "tr"));

      const categories = [
        { id: "ALL", label: "Tümü" },
        ...deptChips,
      ];

      return NextResponse.json({
        ok: true,
        contacts: contactsWithMessages,
        categories,
        myDmEnabled: meUser?.directMessagesEnabled ?? true,
      });
    }

    // 2. SOHBET DİZİSİ VE PARTNER BİLGİSİ
    if (!userId) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    let partnerId = url.searchParams.get("partnerId");
    const beforeParam = url.searchParams.get("before");
    const before = beforeParam && !Number.isNaN(Date.parse(beforeParam)) ? new Date(beforeParam) : null;

    if (!partnerId) {
      const lastMsg = await prisma.directMessage.findFirst({
        where: {
          OR: [{ senderId: userId }, { recipientId: userId }],
        },
        orderBy: { createdAt: "desc" },
      });

      if (lastMsg) {
        partnerId = lastMsg.senderId === userId ? lastMsg.recipientId : lastMsg.senderId;
      }
    }

    if (!partnerId) {
      return NextResponse.json({ ok: true, partner: null, messages: [] });
    }

    const [partnerUser, myBlock, theirBlock, messages] = await Promise.all([
      prisma.user.findUnique({
        where: { id: partnerId },
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          role: true,
          title: true,
          lastActiveAt: true,
          directMessagesEnabled: true,
          department: { select: { name: true, floor: true } },
          computers: { select: { name: true }, take: 1 },
        },
      }),
      prisma.userBlock.findUnique({
        where: { blockerId_blockedId: { blockerId: userId, blockedId: partnerId } },
      }),
      prisma.userBlock.findUnique({
        where: { blockerId_blockedId: { blockerId: partnerId, blockedId: userId } },
      }),
      prisma.directMessage.findMany({
        where: {
          AND: [
            { OR: [
              { senderId: userId, recipientId: partnerId, deletedBySender: false },
              { senderId: partnerId, recipientId: userId, deletedByRecipient: false },
            ] },
            ...(before ? [{ createdAt: { lt: before } }] : []),
          ],
        },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: 61,
      }),
    ]);

    if (!partnerUser) {
      return NextResponse.json({ ok: false, error: "Kullanıcı bulunamadı" }, { status: 404 });
    }

    // Okundu işaretle
    const shouldMarkRead = url.searchParams.get("markRead") !== "false";
    const readResult = shouldMarkRead ? await prisma.directMessage.updateMany({
      where: { senderId: partnerId, recipientId: userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    }) : { count: 0 };
    if (readResult.count) {
      publishChatEvent(partnerId, { kind: "read", partnerId: userId });
      await prisma.notification.updateMany({ where: { userId, type: "DIRECT_MESSAGE", link: `/messages/${partnerId}`, isRead: false }, data: { isRead: true, readAt: new Date() } });
    }

    const now = new Date();
    const isOnline = partnerUser.lastActiveAt
      ? now.getTime() - new Date(partnerUser.lastActiveAt).getTime() < 180000
      : false;

    let lastSeenText = "Çevrimdışı";
    if (isOnline) {
      lastSeenText = "Çevrimiçi";
    } else if (partnerUser.lastActiveAt) {
      const seenDate = new Date(partnerUser.lastActiveAt);
      const isToday = seenDate.toDateString() === now.toDateString();
      const timeStr = seenDate.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
      lastSeenText = isToday ? `Son görülme ${timeStr}` : `Son görülme ${seenDate.toLocaleDateString("tr-TR", { day: "numeric", month: "short" })}`;
    }

    const floorInfo = getFloorInfo(partnerUser.department?.name);
    const partnerFloor = formatFloor(partnerUser.department?.floor || floorInfo.floor);
    const partnerFloorLabel = partnerUser.department?.floor ? `${formatFloor(partnerUser.department.floor)} (${partnerUser.department.name})` : floorInfo.floorLabel;

    const partner = {
      id: partnerUser.id,
      name: partnerUser.name || partnerUser.email,
      email: partnerUser.email,
      image: partnerUser.image,
      role: partnerUser.role,
      // Kiosk her zaman profil ünvanını gösterir; rol adı ünvan yerine geçmez.
      title: partnerUser.title,
      department: partnerUser.department?.name || "HalkTV",
      floor: partnerFloor,
      floorLabel: partnerFloorLabel,
      computerName: partnerUser.computers?.[0]?.name || null,
      isOnline,
      lastActiveAt: partnerUser.lastActiveAt ? partnerUser.lastActiveAt.toISOString() : null,
      lastSeenText,
      directMessagesEnabled: partnerUser.directMessagesEnabled,
      isBlocked: !!myBlock,
      isBlockedBy: !!theirBlock,
    };

    return NextResponse.json({
      ok: true,
      partner,
      partnerTyping: getTyping(userId, partnerId),
      hasMore: messages.length > 60,
      messages: messages.slice(0, 60).reverse().map((m) => ({
        id: m.id,
        body: m.body,
        fromMe: m.senderId === userId,
        createdAt: m.createdAt.toISOString(),
        attachmentUrl: m.attachmentUrl,
        attachmentName: m.attachmentName,
        attachmentType: m.attachmentType,
        isRead: m.isRead,
      })),
    });
  } catch (error: any) {
    console.error("Kiosk chat GET error:", error);
    return NextResponse.json({ ok: false, error: "Mesajlar yüklenemedi" }, { status: 500 });
  }
}

// YENİ MESAJ GÖNDER & AKSİYONLAR
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const userId = await resolveKioskUserId(undefined, body);
    if (!userId) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    // Kullanıcının kendi aktifliğini tazele
    await prisma.user.update({
      where: { id: userId },
      data: { lastActiveAt: new Date() },
    }).catch(() => {});

    if (body.action === "typing" && body.partnerId) {
      setTyping(userId, String(body.partnerId), Boolean(body.isTyping));
      return NextResponse.json({ ok: true });
    }

    // AKSİYON 1: Mesaj alımını aç / kapat (DND Toggle)
    if (body.action === "toggle_dm") {
      const enabled = typeof body.enabled === "boolean" ? body.enabled : true;
      await prisma.user.update({
        where: { id: userId },
        data: { directMessagesEnabled: enabled },
      });
      await auditLog({
        actorId: userId,
        action: "KIOSK_DM_TOGGLED",
        entityType: "User",
        entityId: userId,
        meta: {
          enabled,
          hostname: body.hostname || null,
          username: body.username || null,
          source: "kiosk",
        },
      }).catch(() => {});
      return NextResponse.json({ ok: true, myDmEnabled: enabled });
    }

    // AKSİYON 2: Kişiyi Engelle
    if (body.action === "block_user" && body.partnerId) {
      await prisma.userBlock.upsert({
        where: { blockerId_blockedId: { blockerId: userId, blockedId: body.partnerId } },
        create: { blockerId: userId, blockedId: body.partnerId },
        update: {},
      });
      return NextResponse.json({ ok: true, isBlocked: true });
    }

    // AKSİYON 3: Engeli Kaldır
    if (body.action === "unblock_user" && body.partnerId) {
      await prisma.userBlock.deleteMany({
        where: { blockerId: userId, blockedId: body.partnerId },
      });
      return NextResponse.json({ ok: true, isBlocked: false });
    }

    // AKSİYON 4: Sohbeti Temizle
    if (body.action === "clear_chat" && body.partnerId) {
      await prisma.directMessage.updateMany({
        where: { senderId: userId, recipientId: body.partnerId },
        data: { deletedBySender: true },
      });
      await prisma.directMessage.updateMany({
        where: { senderId: body.partnerId, recipientId: userId },
        data: { deletedByRecipient: true },
      });
      return NextResponse.json({ ok: true });
    }

    if (body.action === "archive_chat" && body.partnerId) {
      await prisma.directMessage.updateMany({ where: { senderId: userId, recipientId: body.partnerId }, data: { archivedBySender: true } });
      await prisma.directMessage.updateMany({ where: { senderId: body.partnerId, recipientId: userId }, data: { archivedByRecipient: true } });
      return NextResponse.json({ ok: true });
    }
    if (body.action === "unarchive_chat" && body.partnerId) {
      await prisma.directMessage.updateMany({ where: { senderId: userId, recipientId: body.partnerId }, data: { archivedBySender: false } });
      await prisma.directMessage.updateMany({ where: { senderId: body.partnerId, recipientId: userId }, data: { archivedByRecipient: false } });
      return NextResponse.json({ ok: true });
    }

    // NORMAL MESAJ GÖNDERME
    const text = (body.message || "").trim();
    let recipientId = body.recipientId;
    const attachmentUrl = body.attachmentUrl || null;
    const attachmentName = body.attachmentName || null;
    const attachmentType = body.attachmentType || null;
    if (attachmentUrl && !verifyUploadClaim(body.attachmentClaimToken, userId, String(attachmentUrl), "messages")) {
      return NextResponse.json({ ok: false, error: "Mesaj eki doğrulanamadı." }, { status: 400 });
    }

    if (!text && !attachmentUrl) {
      return NextResponse.json({ ok: false, error: "Mesaj veya dosya boş olamaz" }, { status: 400 });
    }

    // Hedef IT personeli belirtilmemişse aktif bir IT personeli seç
    if (!recipientId) {
      const itStaff = await prisma.user.findFirst({
        where: {
          role: { in: ["IT_AGENT", "TEKNIK_MUDUR", "SUPER_ADMIN", "TEKNIK_YONETMEN"] },
          status: "ACTIVE",
          id: { not: userId },
        },
        select: { id: true },
      });
      recipientId = itStaff?.id;
    }

    if (!recipientId) {
      return NextResponse.json({ ok: false, error: "Aktif personel bulunamadı" }, { status: 404 });
    }

    // Engel ve Mesaj Alımı Kontrolü
    const [recipient, senderUser, blockCheck] = await Promise.all([
      prisma.user.findUnique({
        where: { id: recipientId },
        select: { id: true, name: true, email: true, role: true, lastActiveAt: true, directMessagesEnabled: true },
      }),
      prisma.user.findUnique({ where: { id: userId }, select: { role: true } }),
      prisma.userBlock.findFirst({
        where: {
          OR: [
            { blockerId: userId, blockedId: recipientId },
            { blockerId: recipientId, blockedId: userId },
          ],
        },
      }),
    ]);

    if (!recipient) {
      return NextResponse.json({ ok: false, error: "Kullanıcı bulunamadı" }, { status: 404 });
    }

    const itRoles = new Set(["IT_AGENT", "TEKNIK_MUDUR", "SUPER_ADMIN", "TEKNIK_YONETMEN"]);
    const senderIsIT = Boolean(senderUser && itRoles.has(senderUser.role));
    const isVerifiedSupportConversation = body.channelMode === "it" && itRoles.has(recipient.role);

    if (blockCheck && !senderIsIT && !isVerifiedSupportConversation) {
      return NextResponse.json({
        ok: false,
        error: blockCheck.blockerId === userId ? "Bu kullanıcıyı engellediniz." : "Bu kullanıcı size mesaj gönderilmesini engelledi.",
      }, { status: 403 });
    }

    if (recipient.directMessagesEnabled === false && !senderIsIT && !isVerifiedSupportConversation) {
      return NextResponse.json({
        ok: false,
        error: "Bu kullanıcı mesaj alımını kapattı.",
      }, { status: 403 });
    }

    const recipientIsOnline = Boolean(
      recipient.lastActiveAt && Date.now() - recipient.lastActiveAt.getTime() < 180_000,
    );
    if (!isVerifiedSupportConversation && !senderIsIT && !recipientIsOnline) {
      return NextResponse.json({
        ok: false,
        error: "Bu kişi şu anda çevrimdışı. Çevrimiçi olduğunda mesaj gönderebilirsiniz.",
      }, { status: 409 });
    }

    const msg = await prisma.directMessage.create({
      data: {
        senderId: userId,
        recipientId,
        body: text || (attachmentType === "image" ? "📷 Görsel" : "📎 Dosya"),
        attachmentUrl,
        attachmentName,
        attachmentType,
      },
    });
    publishChatEvent(recipientId, { kind: "message", partnerId: userId });
    publishChatEvent(userId, { kind: "message", partnerId: recipientId });

    await auditLog({
      actorId: userId,
      action: "KIOSK_MESSAGE_SENT",
      entityType: "DirectMessage",
      entityId: msg.id,
      meta: {
        recipientId,
        hostname: body.hostname || null,
        username: body.username || null,
        hasAttachment: Boolean(attachmentUrl),
        attachmentType,
        bodyLength: text.length,
        source: "kiosk",
      },
    }).catch(() => {});

    // Bildirim oluştur
    const sender = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true, computers: { select: { name: true }, take: 1 } },
    });

    const pcName = sender?.computers?.[0]?.name ? ` [🖥️ ${sender.computers[0].name}]` : "";

    await prisma.notification.create({
      data: {
        userId: recipientId,
        type: "DIRECT_MESSAGE",
        title: `Kiosk Mesaj: ${sender?.name || sender?.email}${pcName}`,
        body: text.length > 100 ? text.slice(0, 100) + "..." : text || "Bir dosya gönderdi",
        link: `/messages/${userId}`,
      },
    }).catch(() => {});

    return NextResponse.json({
      ok: true,
      message: {
        id: msg.id,
        body: msg.body,
        fromMe: true,
        createdAt: msg.createdAt.toISOString(),
        attachmentUrl: msg.attachmentUrl,
        attachmentName: msg.attachmentName,
        attachmentType: msg.attachmentType,
        isRead: false,
      },
    });
  } catch (error: any) {
    console.error("Kiosk chat POST error:", error);
    return NextResponse.json({ ok: false, error: "Mesaj iletilemedi" }, { status: 500 });
  }
}
