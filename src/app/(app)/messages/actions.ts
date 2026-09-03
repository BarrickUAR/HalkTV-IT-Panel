"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { notify } from "@/lib/notify";
import { ROLE_LABELS } from "@/lib/rbac/roles";
import { isITStaff } from "@/lib/rbac/permissions";

export type MessageDTO = {
  id: string;
  body: string;
  fromMe: boolean;
  createdAt: string;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
  attachmentType?: string | null;
  isRead: boolean;
  readAt?: string | null;
};

export type Contact = {
  id: string;
  name: string;
  sub: string;
  department: string | null;
  unread: number;
  role?: string;
  image?: string | null;
  isOnline: boolean;
  isMe: boolean;
  lastMessage?: string;
  lastMessageAt?: string;
};

export async function fetchContacts(
  query?: string,
): Promise<{ contacts: Contact[]; totalUnread: number }> {
  const me = await requireUser();
  const q = (query ?? "").trim().toLowerCase();

  try {
    const [users, unread] = await Promise.all([
      prisma.user.findMany({
        where: {
          status: "ACTIVE",
          ...(q
            ? {
                OR: [
                  { name: { contains: q, mode: "insensitive" } },
                  { email: { contains: q, mode: "insensitive" } },
                ],
              }
            : {}),
        },
        select: { 
          id: true, 
          name: true, 
          email: true, 
          title: true, 
          role: true, 
          image: true,
          lastActiveAt: true,
          department: { select: { name: true } },
          dmSent: {
            where: { recipientId: me.id },
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { body: true, createdAt: true }
          },
          dmReceived: {
            where: { senderId: me.id },
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { body: true, createdAt: true }
          }
        },
        orderBy: { name: "asc" },
        take: 500,
      }),
      prisma.directMessage.groupBy({
        by: ["senderId"],
        where: { recipientId: me.id, isRead: false },
        _count: true,
      }),
    ]);

    const unreadMap = new Map(unread.map((u) => [u.senderId, u._count]));
    const totalUnread = unread.reduce((s, u) => s + u._count, 0);

    const now = new Date();
    
    const contacts: Contact[] = users
      .map((u) => {
        const isOnline = u.lastActiveAt ? (now.getTime() - u.lastActiveAt.getTime()) < 120000 : false; // 2 dakika içinde aktifse online
        
        let lastMsg = null;
        let lastMsgAt = null;
        const sent = u.dmSent[0];
        const rec = u.dmReceived[0];
        
        if (sent && rec) {
          if (sent.createdAt > rec.createdAt) {
             lastMsg = sent.body;
             lastMsgAt = sent.createdAt.toISOString();
          } else {
             lastMsg = "Sen: " + rec.body;
             lastMsgAt = rec.createdAt.toISOString();
          }
        } else if (sent) {
          lastMsg = sent.body;
          lastMsgAt = sent.createdAt.toISOString();
        } else if (rec) {
          lastMsg = "Sen: " + rec.body;
          lastMsgAt = rec.createdAt.toISOString();
        }

        return {
          id: u.id,
          name: u.name ?? u.email ?? "?",
          sub: u.title ?? ROLE_LABELS[u.role],
          department: u.department?.name ?? null,
          unread: unreadMap.get(u.id) ?? 0,
          role: u.role,
          image: u.image,
          isOnline,
          isMe: u.id === me.id,
          lastMessage: lastMsg || undefined,
          lastMessageAt: lastMsgAt || undefined,
        };
      })
      .sort((a, b) => {
        // 1. Unread first
        if (b.unread !== a.unread) return b.unread - a.unread;
        
        // 2. Online users
        if (a.isOnline !== b.isOnline) return a.isOnline ? -1 : 1;

        // 3. Last message time (recent first)
        if (a.lastMessageAt && b.lastMessageAt) {
          return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
        }
        if (a.lastMessageAt) return -1;
        if (b.lastMessageAt) return 1;

        // 4. Alphabetical
        return a.name.localeCompare(b.name, "tr");
      });

    return { contacts, totalUnread };
  } catch {
    return { contacts: [], totalUnread: 0 };
  }
}

export async function unreadMessageCount(): Promise<number> {
  try {
    const me = await requireUser();
    
    // Kullanıcının online durumunu güncelle
    prisma.user.update({
      where: { id: me.id },
      data: { lastActiveAt: new Date() }
    }).catch(() => {});

    return prisma.directMessage.count({
      where: { recipientId: me.id, isRead: false },
    });
  } catch {
    return 0;
  }
}

export async function fetchThread(otherId: string): Promise<MessageDTO[]> {
  try {
    const me = await requireUser();
    const rows = await prisma.directMessage.findMany({
      where: {
        OR: [
          { senderId: me.id, recipientId: otherId },
          { senderId: otherId, recipientId: me.id },
        ],
      },
      orderBy: { createdAt: "asc" },
      take: 300,
    });
    return rows.map((r) => ({
      id: r.id,
      body: r.body,
      fromMe: r.senderId === me.id,
      createdAt: r.createdAt.toISOString(),
      attachmentUrl: r.attachmentUrl,
      attachmentName: r.attachmentName,
      attachmentType: r.attachmentType,
      isRead: r.isRead,
      readAt: r.readAt?.toISOString() ?? null,
    }));
  } catch {
    return [];
  }
}

export async function sendMessage(
  recipientId: string,
  body: string,
  attachmentUrl?: string,
  attachmentName?: string,
  attachmentType?: string,
): Promise<{ ok: boolean; error?: string; message?: MessageDTO }> {
  try {
    const me = await requireUser();
    const text = body.trim();
    if (!text && !attachmentUrl) return { ok: false, error: "Mesaj boş olamaz." };
    if (text.length > 4000) return { ok: false, error: "Mesaj çok uzun." };
    if (recipientId === me.id)
      return { ok: false, error: "Kendine mesaj gönderemezsin." };

    const recipient = await prisma.user.findUnique({
      where: { id: recipientId },
      select: { id: true },
    });
    if (!recipient) return { ok: false, error: "Kullanıcı bulunamadı." };

    const msg = await prisma.directMessage.create({
      data: {
        senderId: me.id,
        recipientId,
        body: text,
        attachmentUrl: attachmentUrl ?? null,
        attachmentName: attachmentName ?? null,
        attachmentType: attachmentType ?? null,
      },
    });
    
    await notify(recipientId, {
      type: "DIRECT_MESSAGE",
      title: `${me.name ?? me.email ?? "Biri"} mesaj gönderdi`,
      body: text.slice(0, 80),
      link: `/messages/${me.id}`,
      entityType: "DirectMessage",
      entityId: me.id,
    });
    revalidatePath(`/messages/${recipientId}`);
    revalidatePath("/messages");
    
    return { 
      ok: true, 
      message: { 
        id: msg.id, 
        body: msg.body, 
        fromMe: true, 
        createdAt: msg.createdAt.toISOString(),
        attachmentUrl: msg.attachmentUrl,
        attachmentName: msg.attachmentName,
        attachmentType: msg.attachmentType,
        isRead: msg.isRead,
        readAt: msg.readAt?.toISOString() ?? null,
      } 
    };
  } catch {
    return { ok: false, error: "Gönderilemedi." };
  }
}

export async function markThreadRead(otherId: string): Promise<void> {
  try {
    const me = await requireUser();
    await prisma.directMessage.updateMany({
      where: { senderId: otherId, recipientId: me.id, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
  } catch {
    // sessiz geç
  }
}

export async function deleteMessage(messageId: string): Promise<{ ok: boolean }> {
  try {
    const me = await requireUser();
    const isStaff = isITStaff(me.role);
    const msg = await prisma.directMessage.findUnique({ where: { id: messageId }});
    if (!msg) return { ok: false };
    
    // Gönderen kişi VEYA IT ekibi silebilir
    if (msg.senderId !== me.id && !isStaff) return { ok: false }; 

    await prisma.directMessage.delete({ where: { id: messageId } });
    revalidatePath(`/messages/${msg.recipientId}`);
    return { ok: true };
  } catch {
    return { ok: false };
  }
}
