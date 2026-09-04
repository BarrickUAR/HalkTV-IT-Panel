"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { TicketStatus } from "@prisma/client";

import { requireUser } from "@/lib/auth-helpers";
import { notify, notifyMany } from "@/lib/notify";
import { prisma } from "@/lib/prisma";
import { isITStaff } from "@/lib/rbac/permissions";
import { STATUS_LABELS } from "@/lib/ticket-labels";

import type { CommentDTO } from "./comment-types";

/** Talebe erişim yetkisi + bağlam. Yetkisizse null. */
async function ctxFor(ticketId: string) {
  const user = await requireUser();
  const it = isITStaff(user.role);
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    select: {
      id: true,
      number: true,
      requesterId: true,
      assigneeId: true,
      status: true,
    },
  });
  if (!ticket) return null;
  if (!it && ticket.requesterId !== user.id) return null;
  return { user, it, ticket };
}

async function itStaffIds(): Promise<string[]> {
  const rows = await prisma.user.findMany({
    where: {
      role: { in: ["IT_AGENT", "TEKNIK_YONETMEN", "TEKNIK_MUDUR", "SUPER_ADMIN"] },
      status: "ACTIVE",
    },
    select: { id: true },
  });
  return rows.map((r) => r.id);
}

export async function fetchComments(ticketId: string): Promise<CommentDTO[]> {
  const ctx = await ctxFor(ticketId);
  if (!ctx) return [];
  const comments = await prisma.ticketComment.findMany({
    where: ctx.it ? { ticketId } : { ticketId, visibility: "PUBLIC" },
    orderBy: { createdAt: "asc" },
    include: { author: { select: { id: true, name: true, email: true } } },
  });
  return comments.map((c) => ({
    id: c.id,
    body: c.body,
    visibility: c.visibility,
    authorId: c.authorId,
    authorName: c.author.name ?? c.author.email ?? "?",
    createdAt: c.createdAt.toISOString(),
  }));
}

const addSchema = z.object({
  ticketId: z.string().min(1),
  body: z.string().trim().min(1, "Mesaj boş olamaz.").max(4000),
  visibility: z.enum(["PUBLIC", "INTERNAL"]),
});

export async function addComment(input: {
  ticketId: string;
  body: string;
  visibility: "PUBLIC" | "INTERNAL";
}): Promise<{ ok: boolean; error?: string }> {
  const parsed = addSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message };
  }
  const ctx = await ctxFor(parsed.data.ticketId);
  if (!ctx) return { ok: false, error: "Yetkin yok." };

  // Çalışan iç not gönderemez.
  const visibility = ctx.it ? parsed.data.visibility : "PUBLIC";
  await prisma.ticketComment.create({
    data: {
      ticketId: parsed.data.ticketId,
      authorId: ctx.user.id,
      body: parsed.data.body,
      visibility,
    },
  });

  // Bildirim: karşı taraf(lar)a
  const t = ctx.ticket;
  let recipients: string[] = [];
  if (ctx.it) {
    if (visibility === "PUBLIC") recipients = [t.requesterId];
    else if (t.assigneeId) recipients = [t.assigneeId];
  } else {
    recipients = t.assigneeId ? [t.assigneeId] : await itStaffIds();
  }
  await notifyMany(
    recipients.filter((id) => id !== ctx.user.id),
    {
      type: "TICKET_COMMENT",
      title: `${ctx.user.name ?? ctx.user.email ?? "Biri"} mesaj gönderdi`,
      body: parsed.data.body.slice(0, 80),
      link: `/tickets/${t.id}`,
      entityType: "Ticket",
      entityId: t.id,
    },
  );

  revalidatePath(`/tickets/${parsed.data.ticketId}`);
  return { ok: true };
}

const STATUSES: TicketStatus[] = [
  "OPEN",
  "IN_PROGRESS",
  "WAITING_REQUESTER",
  "RESOLVED",
  "CLOSED",
  "CANCELLED",
];

export async function updateTicketStatus(
  ticketId: string,
  status: TicketStatus,
): Promise<{ ok: boolean }> {
  const user = await requireUser();
  if (!isITStaff(user.role)) return { ok: false };
  if (!STATUSES.includes(status)) return { ok: false };

  const ticket = await prisma.ticket.update({
    where: { id: ticketId },
    data: {
      status,
      resolvedAt: status === "RESOLVED" ? new Date() : undefined,
      closedAt: status === "CLOSED" ? new Date() : undefined,
    },
    select: { title: true, requesterId: true, number: true },
  });

  await prisma.auditLog.create({
    data: {
      actorId: user.id,
      action: "STATUS_CHANGED",
      entityType: "Ticket",
      entityId: ticketId,
      metadata: { newStatus: status },
    }
  });

  if (ticket.requesterId !== user.id) {
    await notify(ticket.requesterId, {
      type: "TICKET_STATUS",
      title: `Talebin durumu: ${STATUS_LABELS[status]}`,
      body: ticket.title,
      link: `/tickets/${ticketId}`,
      entityType: "Ticket",
      entityId: ticketId,
    });
  }
  revalidatePath(`/tickets/${ticketId}`);
  return { ok: true };
}

export async function assignTicket(
  ticketId: string,
  assigneeId: string | null,
): Promise<{ ok: boolean }> {
  const user = await requireUser();
  if (!isITStaff(user.role)) return { ok: false };

  const current = await prisma.ticket.findUnique({
    where: { id: ticketId },
    select: { status: true, number: true, title: true },
  });
  await prisma.ticket.update({
    where: { id: ticketId },
    data: {
      assigneeId,
      ...(assigneeId && current?.status === "OPEN"
        ? { status: "IN_PROGRESS" }
        : {}),
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: user.id,
      action: "ASSIGNED",
      entityType: "Ticket",
      entityId: ticketId,
      metadata: { newAssigneeId: assigneeId },
    }
  });

  if (assigneeId && assigneeId !== user.id) {
    await notify(assigneeId, {
      type: "TICKET_ASSIGNED",
      title: "Sana yeni talep atandı",
      body: current?.title,
      link: `/tickets/${ticketId}`,
      entityType: "Ticket",
      entityId: ticketId,
    });
  }
  revalidatePath(`/tickets/${ticketId}`);
  return { ok: true };
}

export async function submitSurvey(
  ticketId: string,
  rating: number,
  comment: string,
): Promise<{ ok: boolean; error?: string }> {
  const user = await requireUser();
  const ticket = await prisma.ticket.findUnique({
    where: { id: ticketId },
    select: { requesterId: true, status: true },
  });
  if (!ticket || ticket.requesterId !== user.id) {
    return { ok: false, error: "Yetkin yok." };
  }
  if (ticket.status !== "RESOLVED" && ticket.status !== "CLOSED") {
    return { ok: false, error: "Talep henüz çözülmedi." };
  }
  if (rating < 1 || rating > 5) return { ok: false, error: "Puan 1-5 olmalı." };

  await prisma.satisfactionSurvey.upsert({
    where: { ticketId },
    update: { rating, comment: comment || null },
    create: { ticketId, rating, comment: comment || null },
  });
  revalidatePath(`/tickets/${ticketId}`);
  return { ok: true };
}

export async function logTime(
  ticketId: string,
  minutes: number,
  note: string,
): Promise<{ ok: boolean; error?: string }> {
  const user = await requireUser();
  if (!isITStaff(user.role)) return { ok: false, error: "Yetkin yok." };
  if (!Number.isFinite(minutes) || minutes <= 0 || minutes > 100000) {
    return { ok: false, error: "Geçersiz süre." };
  }
  await prisma.timeEntry.create({
    data: {
      ticketId,
      userId: user.id,
      minutes: Math.round(minutes),
      note: note || null,
    },
  });
  revalidatePath(`/tickets/${ticketId}`);
  return { ok: true };
}

/** Ticket birleştirme — IT personeli için */
export async function mergeTicket(
  sourceId: string,
  targetId: string,
): Promise<{ ok: boolean; error?: string }> {
  const user = await requireUser();
  if (!isITStaff(user.role)) return { ok: false, error: "Yetkin yok." };
  if (sourceId === targetId) return { ok: false, error: "Aynı talep seçildi." };

  const [source, target] = await Promise.all([
    prisma.ticket.findUnique({ where: { id: sourceId }, select: { id: true, number: true, status: true } }),
    prisma.ticket.findUnique({ where: { id: targetId }, select: { id: true, number: true } }),
  ]);

  if (!source || !target) return { ok: false, error: "Talep bulunamadı." };
  if (source.status === "CLOSED" || source.status === "CANCELLED") {
    return { ok: false, error: "Kapalı talep birleştirilemez." };
  }

  await prisma.$transaction([
    // Yorumları hedef talebe taşı
    prisma.ticketComment.updateMany({
      where: { ticketId: sourceId },
      data: { ticketId: targetId },
    }),
    // Kaynak talebe birleştirme notu ekle
    prisma.ticketComment.create({
      data: {
        ticketId: targetId,
        authorId: user.id,
        body: `🔀 Bu talep **${source.number}** numaralı taleple birleştirildi.`,
        visibility: "PUBLIC",
      },
    }),
    // Kaynak talebi kapat
    prisma.ticket.update({
      where: { id: sourceId },
      data: {
        status: "CLOSED",
        closedAt: new Date(),
      },
    }),
  ]);

  revalidatePath(`/tickets/${targetId}`);
  revalidatePath(`/tickets/${sourceId}`);
  return { ok: true };
}

/** Ticket arşivle — IT personeli için */
export async function archiveTicket(ticketId: string): Promise<{ ok: boolean; error?: string }> {
  const user = await requireUser();
  if (!isITStaff(user.role)) return { ok: false, error: "Yetkin yok." };

  await prisma.ticket.update({
    where: { id: ticketId },
    data: { archivedAt: new Date() },
  });

  revalidatePath("/tickets");
  return { ok: true };
}

/** Ticket arşivden çıkar */
export async function unarchiveTicket(ticketId: string): Promise<{ ok: boolean; error?: string }> {
  const user = await requireUser();
  if (!isITStaff(user.role)) return { ok: false, error: "Yetkin yok." };

  await prisma.ticket.update({
    where: { id: ticketId },
    data: { archivedAt: null },
  });

  revalidatePath("/tickets");
  return { ok: true };
}

/** Ticket sil (soft delete) — IT personeli için */
export async function deleteTicket(ticketId: string): Promise<{ ok: boolean; error?: string }> {
  const user = await requireUser();
  if (!isITStaff(user.role)) return { ok: false, error: "Yetkin yok." };

  await prisma.ticket.update({
    where: { id: ticketId },
    data: { deletedAt: new Date() },
  });

  revalidatePath("/tickets");
  revalidatePath(`/tickets/${ticketId}`);
  return { ok: true };
}
