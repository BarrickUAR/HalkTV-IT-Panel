import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveKioskUser } from "@/lib/auth-helpers";
import { auditLog } from "@/lib/logger";
import { TicketStatus } from "@prisma/client";
import { STATUS_LABELS } from "@/lib/ticket-labels";
import { nextTicketNumber } from "@/lib/tickets";
import { publishChatEvent } from "@/lib/chat-events";
import { verifyUploadClaim } from "@/lib/upload-claim";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const url = req.nextUrl;
    const userId = url.searchParams.get("userId");
    const hostname = url.searchParams.get("hostname");
    const username = url.searchParams.get("username");

    const user = await resolveKioskUser({ userId, hostname, username });

    if (!user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const isIT = ["SUPER_ADMIN", "TEKNIK_MUDUR", "TEKNIK_YONETMEN", "IT_AGENT"].includes(user.role);

    // Tekil bilet detayı istenmişse
    const ticketId = url.searchParams.get("ticketId");
    if (ticketId) {
      const ticket = await prisma.ticket.findUnique({
        where: { id: ticketId },
        include: {
          requester: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              title: true,
              department: { select: { name: true, floor: true } },
            },
          },
          assignee: { select: { id: true, name: true, email: true } },
          comments: {
            where: isIT ? undefined : { visibility: "PUBLIC" },
            orderBy: { createdAt: "asc" },
            include: {
              author: { select: { id: true, name: true, role: true, title: true, image: true } },
              attachments: { select: { id: true, fileName: true, storagePath: true, mimeType: true, sizeBytes: true } },
            },
          },
          attachments: { select: { id: true, fileName: true, storagePath: true, mimeType: true, sizeBytes: true } },
        },
      });

      if (!ticket) {
        return NextResponse.json({ ok: false, error: "Bilet bulunamadı" }, { status: 404 });
      }

      // Yetki kontrolü: IT değilse ve bilet kendisinin değilse göremez
      if (!isIT && ticket.requesterId !== user.id) {
        return NextResponse.json({ ok: false, error: "Yetkisiz erişim" }, { status: 403 });
      }

      // Açıklama içinden AnyDesk ID veya IP çözümle
      const anydeskMatch = ticket.description.match(/AnyDesk(?:\s*ID)?:\s*([0-9\s]+)/i)?.[1]?.trim() || null;
      const ipMatch = ticket.description.match(/IP:\s*([0-9.]+)/i)?.[1]?.trim() || null;
      const pcMatch = ticket.description.match(/(?:PC|Bilgisayar|Hostname):\s*([a-zA-Z0-9_-]+)/i)?.[1]?.trim() || null;

      return NextResponse.json({
        ok: true,
        isIT,
        ticket: {
          id: ticket.id,
          number: ticket.number,
          title: ticket.title,
          description: ticket.description,
          status: ticket.status,
          priority: ticket.priority,
          category: ticket.category,
          createdAt: ticket.createdAt.toISOString(),
          updatedAt: ticket.updatedAt.toISOString(),
          slaDueAt: ticket.slaDueAt?.toISOString() ?? null,
          requester: ticket.requester,
          assignee: ticket.assignee,
          anydeskId: anydeskMatch,
          computerIp: ipMatch,
          computerName: pcMatch,
          comments: ticket.comments.map((c) => ({
            id: c.id,
            body: c.body,
            createdAt: c.createdAt.toISOString(),
            author: c.author,
            attachments: c.attachments,
          })),
          attachments: ticket.attachments,
        },
      });
    }

    const tickets = await prisma.ticket.findMany({
      where: isIT ? {} : { requesterId: user.id },
      orderBy: { createdAt: "desc" },
      take: 200,
      select: {
        id: true,
        number: true,
        title: true,
        description: true,
        status: true,
        priority: true,
        category: true,
        createdAt: true,
        updatedAt: true,
        slaDueAt: true,
        requester: { select: { name: true, department: { select: { name: true, floor: true } } } },
        assignee: { select: { name: true } },
        _count: { select: { comments: { where: isIT ? undefined : { visibility: "PUBLIC" } } } },
      },
    });

    return NextResponse.json({
      ok: true,
      isIT,
      tickets: tickets.map((t) => {
        const anydeskMatch = t.description.match(/AnyDesk(?:\s*ID)?:\s*([0-9\s]+)/i)?.[1]?.trim() || null;
        const ipMatch = t.description.match(/IP:\s*([0-9.]+)/i)?.[1]?.trim() || null;
        return {
          id: t.id,
          number: t.number,
          title: t.title,
          description: t.description,
          status: t.status,
          priority: t.priority,
          category: t.category,
          createdAt: t.createdAt.toISOString(),
          updatedAt: t.updatedAt.toISOString(),
          slaDueAt: t.slaDueAt?.toISOString() ?? null,
          requesterName: t.requester?.name ?? "Anonim",
          requester: t.requester ? { name: t.requester.name, department: t.requester.department } : null,
          departmentName: t.requester?.department?.name ?? null,
          floor: t.requester?.department?.floor ?? null,
          assigneeName: t.assignee?.name ?? null,
          anydeskId: anydeskMatch,
          computerIp: ipMatch,
          commentCount: t._count.comments,
          _count: { comments: t._count.comments },
        };
      }),
    });
  } catch (error: any) {
    console.error("kiosk-tickets GET error:", error);
    return NextResponse.json({ ok: false, error: "Biletler alınamadı" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, ticketId, commentText, status, userId, hostname, username } = body;

    const user = await resolveKioskUser({ userId, hostname, username });
    if (!user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const isIT = ["SUPER_ADMIN", "TEKNIK_MUDUR", "TEKNIK_YONETMEN", "IT_AGENT"].includes(user.role);

    // 0. Yeni Talep Oluşturma (Kiosk İçi)
    if (action === "create") {
      const { title, description, category, priority, anydeskId, ip, attachment } = body;
      if (!title?.trim() || !description?.trim()) {
        return NextResponse.json({ ok: false, error: "Başlık ve açıklama zorunludur" }, { status: 400 });
      }
      if (attachment?.url && !verifyUploadClaim(attachment.claimToken, user.id, String(attachment.url), "tickets")) {
        return NextResponse.json({ ok: false, error: "Talep eki doğrulanamadı." }, { status: 400 });
      }
      if (attachment?.url && (!Number.isInteger(Number(attachment.sizeBytes)) || Number(attachment.sizeBytes) < 1 || Number(attachment.sizeBytes) > 50 * 1024 * 1024)) {
        return NextResponse.json({ ok: false, error: "Talep eki geçersiz." }, { status: 400 });
      }

      const ticketNumber = await nextTicketNumber();

      // Açıklamaya cihaz bilgilerini ekle
      let fullDesc = description.trim();
      const metaLines: string[] = [];
      if (hostname && hostname !== "—") metaLines.push(`Hostname: ${hostname}`);
      if (username && username !== "—") metaLines.push(`Kullanıcı: ${username}`);
      if (anydeskId) metaLines.push(`AnyDesk ID: ${anydeskId}`);
      if (ip && ip !== "127.0.0.1") metaLines.push(`IP: ${ip}`);
      if (metaLines.length > 0) {
        fullDesc += "\n\n--- Cihaz & Bağlantı Bilgileri ---\n" + metaLines.join("\n");
      }

      const validCategories = ["HARDWARE", "SOFTWARE", "ACCOUNT_ACCESS", "NETWORK", "EMAIL", "OTHER"];
      const validPriorities = ["LOW", "MEDIUM", "HIGH", "URGENT"];
      const selectedPriority = (validPriorities.includes(priority) ? priority : "MEDIUM") as "LOW" | "MEDIUM" | "HIGH" | "URGENT";
      const slaHours = { LOW: 72, MEDIUM: 24, HIGH: 8, URGENT: 2 }[selectedPriority];

      const newTicket = await prisma.ticket.create({
        data: {
          number: ticketNumber,
          title: title.trim(),
          description: fullDesc,
          category: validCategories.includes(category) ? category : "OTHER",
          priority: selectedPriority,
          status: "OPEN",
          source: "PORTAL",
          slaDueAt: new Date(Date.now() + slaHours * 3_600_000),
          requesterId: user.id,
          departmentId: user.departmentId || null,
        },
      });

      if (attachment?.url) {
        const storagePath = String(attachment.url);
        const fileName = String(attachment.fileName || "Ek dosya").slice(0, 255);
        const mimeType = String(attachment.mimeType || "application/octet-stream").slice(0, 150);
        const sizeBytes = Number(attachment.sizeBytes || 0);
        await prisma.attachment.create({ data: { ticketId: newTicket.id, uploaderId: user.id, fileName, storagePath, mimeType, sizeBytes } });
      }

      // Kiosk'tan açılan talep tüm teknik yöneticilerin web/kiosk bildirim akışına düşer.
      const itUsers = await prisma.user.findMany({
        where: { role: { in: ["SUPER_ADMIN", "TEKNIK_MUDUR", "TEKNIK_YONETMEN", "IT_AGENT"] }, id: { not: user.id } },
        select: { id: true },
      });
      await prisma.notification.createMany({
        data: itUsers.map((recipient) => ({
          userId: recipient.id,
          type: "TICKET_CREATED",
          title: `Yeni destek talebi #${newTicket.number}`,
          body: `${user.name || user.email}: ${newTicket.title}`,
          link: `/tickets/${newTicket.id}`,
        })),
      });
      for (const recipient of itUsers) publishChatEvent(recipient.id, { kind: "notification" });

      await auditLog({
        actorId: user.id,
        action: "KIOSK_TICKET_CREATED",
        entityType: "Ticket",
        entityId: newTicket.id,
        meta: {
          number: newTicket.number,
          title: newTicket.title,
          hostname: hostname || null,
          username: username || null,
          ip: ip || null,
          anydeskId: anydeskId || null,
          source: "kiosk",
        },
      }).catch(() => {});

      return NextResponse.json({ ok: true, ticket: newTicket });
    }

    if (!ticketId) {
      return NextResponse.json({ ok: false, error: "Bilet ID gerekli" }, { status: 400 });
    }

    const replyTarget = await prisma.ticket.findUnique({ where: { id: ticketId }, select: { number: true, requesterId: true, assigneeId: true, status: true } });
    if (!replyTarget) return NextResponse.json({ ok: false, error: "Talep bulunamadı." }, { status: 404 });
    if (!isIT && replyTarget.requesterId !== user.id) return NextResponse.json({ ok: false, error: "Bu talebe erişim yetkiniz yok." }, { status: 403 });

    // Yorum / Cevap Ekleme
    if (action === "comment" && (commentText?.trim() || body.attachment?.url)) {
      if (["RESOLVED", "CLOSED", "CANCELLED"].includes(replyTarget.status)) return NextResponse.json({ ok: false, error: "Yanıt yazmak için önce talebi yeniden açın." }, { status: 400 });
      if (typeof commentText !== "string" || commentText.length > 10000) return NextResponse.json({ ok: false, error: "Yanıt en fazla 10.000 karakter olabilir." }, { status: 400 });
      if (body.attachment?.url && !verifyUploadClaim(body.attachment.claimToken, user.id, String(body.attachment.url), "tickets")) {
        return NextResponse.json({ ok: false, error: "Yanıt eki doğrulanamadı." }, { status: 400 });
      }
      if (body.attachment?.url && (!Number.isInteger(Number(body.attachment.sizeBytes)) || Number(body.attachment.sizeBytes) < 1 || Number(body.attachment.sizeBytes) > 50 * 1024 * 1024)) {
        return NextResponse.json({ ok: false, error: "Yanıt eki geçersiz." }, { status: 400 });
      }
      const ticketForReply = await prisma.ticket.findUnique({ where: { id: ticketId }, select: { number: true, requesterId: true } });
      const newComment = await prisma.ticketComment.create({
        data: {
          ticketId,
          authorId: user.id,
          body: commentText.trim() || "Dosya eklendi.",
        },
        include: {
          author: { select: { id: true, name: true, role: true, title: true, image: true } },
        },
      });

      if (body.attachment?.url) {
        const storagePath = String(body.attachment.url);
        const fileName = String(body.attachment.fileName || "Ek dosya").slice(0, 255);
        const mimeType = String(body.attachment.mimeType || "application/octet-stream").slice(0, 150);
        const sizeBytes = Number(body.attachment.sizeBytes || 0);
        await prisma.attachment.create({ data: { commentId: newComment.id, ticketId, uploaderId: user.id, fileName, storagePath, mimeType, sizeBytes } });
      }

      await prisma.ticket.update({ where: { id: ticketId }, data: { updatedAt: new Date() } });
      await auditLog({ actorId: user.id, action: "COMMENT_ADDED", entityType: "Ticket", entityId: ticketId, meta: { hostname, username, ip: body.ip, number: replyTarget.number } });
      // If staff replies, notify the assigned technician (or the active support team).
      if (!isIT) {
        const recipients = replyTarget.assigneeId ? [{ id: replyTarget.assigneeId }] : await prisma.user.findMany({ where: { status: "ACTIVE", role: { in: ["SUPER_ADMIN", "TEKNIK_MUDUR", "TEKNIK_YONETMEN", "IT_AGENT"] } }, select: { id: true } });
        await prisma.notification.createMany({ data: recipients.filter(r => r.id !== user.id).map(r => ({ userId: r.id, type: "TICKET_COMMENT" as const, title: `Talebe yeni yanıt · #${replyTarget.number}`, body: `${user.name || "Personel"}: ${(commentText.trim() || "Dosya ekledi").slice(0, 100)}`, link: `/tickets/${ticketId}` })) });
        for (const recipient of recipients) if (recipient.id !== user.id) publishChatEvent(recipient.id, { kind: "notification" });
      }
      if (isIT) {
        await prisma.ticket.update({
          where: { id: ticketId },
          data: { updatedAt: new Date(), ...(replyTarget.status === "OPEN" ? { status: "IN_PROGRESS" } : {}) },
        });
        if (ticketForReply?.requesterId && ticketForReply.requesterId !== user.id) {
          await prisma.notification.create({ data: {
            userId: ticketForReply.requesterId,
            type: "TICKET_COMMENT",
            title: `Talebiniz yanıtlandı · #${ticketForReply.number}`,
            body: `Teknik ekip talebinize yanıt verdi: ${(commentText.trim() || "Dosya ekledi").slice(0, 70)}`,
            link: `/tickets/${ticketId}`,
          } }).catch(() => {});
          publishChatEvent(ticketForReply.requesterId, { kind: "notification" });
        }
      }

      return NextResponse.json({ ok: true, comment: newComment });
    }

    // Durum Güncelleme
    if (action === "status" && status) {
      if (!isIT) {
        return NextResponse.json({ ok: false, error: "Durum değiştirme yetkisi yok" }, { status: 403 });
      }
      if (!Object.values(TicketStatus).includes(status)) return NextResponse.json({ ok: false, error: "Geçersiz talep durumu." }, { status: 400 });

      const updatedTicket = await prisma.ticket.update({
        where: { id: ticketId },
        data: {
          status,
          updatedAt: new Date(),
          closedAt: ["RESOLVED", "CLOSED"].includes(status) ? new Date() : null,
        },
      });

      await prisma.ticketComment.create({
        data: {
          ticketId,
          authorId: user.id,
          body: `Talep durumu güncellendi: ${STATUS_LABELS[status as TicketStatus]}`,
        },
      });
      await auditLog({ actorId: user.id, action: "STATUS_CHANGED", entityType: "Ticket", entityId: ticketId, meta: { oldStatus: replyTarget.status, newStatus: status, hostname, username, ip: body.ip } });
      if (replyTarget.requesterId !== user.id) await prisma.notification.create({ data: { userId: replyTarget.requesterId, type: "TICKET_STATUS", title: `Talep durumu güncellendi · #${replyTarget.number}`, body: STATUS_LABELS[status as TicketStatus], link: `/tickets/${ticketId}` } });
      if (replyTarget.requesterId !== user.id) publishChatEvent(replyTarget.requesterId, { kind: "notification" });

      return NextResponse.json({ ok: true, ticket: updatedTicket });
    }

    return NextResponse.json({ ok: false, error: "Geçersiz işlem" }, { status: 400 });
  } catch (error: any) {
    console.error("kiosk-tickets POST error:", error);
    return NextResponse.json({ ok: false, error: "İşlem başarısız oldu" }, { status: 500 });
  }
}
