import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveKioskUser } from "@/lib/auth-helpers";
import { authenticateDeviceRequest } from "@/lib/device-auth";
import { publishChatEvent } from "@/lib/chat-events";
import { rateLimit, requestIp } from "@/lib/rate-limit";
import { auditLog } from "@/lib/logger";

export const dynamic = "force-dynamic";

const IT_ROLES = new Set(["SUPER_ADMIN", "TEKNIK_MUDUR", "TEKNIK_YONETMEN", "IT_AGENT"]);
const MANAGER_ROLES = new Set(["SUPER_ADMIN", "TEKNIK_MUDUR", "TEKNIK_YONETMEN"]);
const assignmentInclude = { assignee: { select: { id: true, name: true, title: true, status: true, role: true, lastActiveAt: true } } } as const;

async function context(req: NextRequest, computerId: string | null) {
  const user = await resolveKioskUser();
  if (computerId && user && IT_ROLES.has(user.role)) {
    await prisma.user.updateMany({ where: { id: user.id, OR: [{ lastActiveAt: null }, { lastActiveAt: { lt: new Date(Date.now() - 60_000) } }] }, data: { lastActiveAt: new Date() } });
    const computer = await prisma.computer.findUnique({ where: { id: computerId }, include: { deviceCredential: { select: { isActive: true } }, deviceChatAssignment: { include: assignmentInclude } } });
    return computer ? { computer, direction: "ADMIN" as const, user } : null;
  }
  const device = await authenticateDeviceRequest(req);
  if (!device?.id) return null;
  const computer = await prisma.computer.findUnique({ where: { id: device.id }, include: { deviceCredential: { select: { isActive: true } }, deviceChatAssignment: { include: assignmentInclude } } });
  return computer?.deviceCredential?.isActive ? { computer, direction: "DEVICE" as const, user: null } : null;
}

export async function GET(req: NextRequest) {
  const ctx = await context(req, req.nextUrl.searchParams.get("computerId"));
  if (!ctx) return NextResponse.json({ ok: false, error: "Cihaz sohbetine erişim yetkisi yok." }, { status: 401 });
  const before = req.nextUrl.searchParams.get("before");
  if (before && !await prisma.deviceConversationMessage.findFirst({ where: { id: before, computerId: ctx.computer.id }, select: { id: true } })) {
    return NextResponse.json({ ok: false, error: "Mesaj konumu geçersiz." }, { status: 400 });
  }
  const [page, unreadCount] = await Promise.all([prisma.deviceConversationMessage.findMany({
    where: { computerId: ctx.computer.id }, orderBy: [{ createdAt: "desc" }, { id: "desc" }], take: 51,
    ...(before ? { cursor: { id: before }, skip: 1 } : {}),
    select: { id: true, direction: true, body: true, senderName: true, senderTitle: true, readAt: true, createdAt: true },
  }), prisma.deviceConversationMessage.count({ where: { computerId: ctx.computer.id, direction: ctx.direction === "ADMIN" ? "DEVICE" : "ADMIN", readAt: null } })]);
  const hasMore = page.length > 50;
  const messages = page.slice(0, 50).reverse();
  return NextResponse.json({ ok: true, computer: { id: ctx.computer.id, name: ctx.computer.name, windowsUser: ctx.computer.windowsUser }, mode: ctx.direction, unreadCount, hasMore, assignment: ctx.computer.deviceChatAssignment ? { assigneeId: ctx.computer.deviceChatAssignment.assigneeId, name: ctx.computer.deviceChatAssignment.assignee.name, title: ctx.computer.deviceChatAssignment.assignee.title, status: ctx.computer.deviceChatAssignment.assignee.status, assignedAt: ctx.computer.deviceChatAssignment.assignedAt } : null, viewerId: ctx.user?.id || null, messages });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null) as { computerId?: string; message?: string; action?: string; messageIds?: string[] } | null;
  const ctx = await context(req, body?.computerId || null);
  if (!ctx) return NextResponse.json({ ok: false, error: "Cihaz sohbetine erişim yetkisi yok." }, { status: 401 });
  if (["claim", "release", "takeover"].includes(body?.action || "")) {
    if (ctx.direction !== "ADMIN") return NextResponse.json({ ok: false, error: "Yönetici oturumu gerekli." }, { status: 403 });
    const current = ctx.computer.deviceChatAssignment;
    if (body?.action === "release") {
      if (current?.assigneeId !== ctx.user.id) return NextResponse.json({ ok: false, error: "Bu sohbet size atanmış değil." }, { status: 409 });
      await prisma.deviceConversationAssignment.deleteMany({ where: { computerId: ctx.computer.id, assigneeId: ctx.user.id } });
    } else if (body?.action === "takeover") {
      if (!MANAGER_ROLES.has(ctx.user.role)) return NextResponse.json({ ok: false, error: "Sohbeti yalnızca teknik yönetici devralabilir." }, { status: 403 });
      await prisma.deviceConversationAssignment.upsert({ where: { computerId: ctx.computer.id }, create: { computerId: ctx.computer.id, assigneeId: ctx.user.id }, update: { assigneeId: ctx.user.id, assignedAt: new Date() } });
    } else {
      if (current && current.assigneeId !== ctx.user.id) {
        const reassigned = await prisma.deviceConversationAssignment.updateMany({
          where: { id: current.id, assigneeId: current.assigneeId, assignedAt: { lt: new Date(Date.now() - 120_000) }, assignee: { OR: [{ status: { not: "ACTIVE" } }, { role: { notIn: [...IT_ROLES] as any } }, { lastActiveAt: null }, { lastActiveAt: { lt: new Date(Date.now() - 120_000) } }] } },
          data: { assigneeId: ctx.user.id, assignedAt: new Date() },
        });
        if (!reassigned.count) return NextResponse.json({ ok: false, error: `Sohbet ${current.assignee.name || "başka bir yönetici"} tarafından üstlenilmiş.` }, { status: 409 });
      }
      if (!current) {
        try { await prisma.deviceConversationAssignment.create({ data: { computerId: ctx.computer.id, assigneeId: ctx.user.id } }); }
        catch { return NextResponse.json({ ok: false, error: "Sohbet başka bir yönetici tarafından üstlenildi. Yenileyin." }, { status: 409 }); }
      }
    }
    await auditLog({ actorId: ctx.user.id, action: `DEVICE_CHAT_${body?.action?.toUpperCase()}`, entityType: "Computer", entityId: ctx.computer.id, meta: { hostname: ctx.computer.name } });
    publishChatEvent(`device:${ctx.computer.name.toLowerCase()}`, { kind: "device-chat", computerId: ctx.computer.id });
    return NextResponse.json({ ok: true });
  }
  if (body?.action === "read") {
    const ids = Array.isArray(body.messageIds) ? [...new Set(body.messageIds.filter((id): id is string => typeof id === "string" && id.length <= 100))].slice(0, 50) : [];
    if (!ids.length) return NextResponse.json({ ok: false, error: "Okunan mesaj belirtilmedi." }, { status: 400 });
    await prisma.deviceConversationMessage.updateMany({
      where: { id: { in: ids }, computerId: ctx.computer.id, direction: ctx.direction === "ADMIN" ? "DEVICE" : "ADMIN", readAt: null },
      data: { readAt: new Date() },
    });
    if (ctx.direction === "ADMIN") await prisma.notification.updateMany({
      where: { userId: ctx.user.id, type: "DEVICE_MESSAGE", entityId: ctx.computer.id, isRead: false, link: { in: ids.map(id => `/kiosk?deviceChat=${encodeURIComponent(ctx.computer.id)}&messageId=${encodeURIComponent(id)}`) } },
      data: { isRead: true, readAt: new Date() },
    });
    return NextResponse.json({ ok: true });
  }
  const message = body?.message?.trim() || "";
  if (!message || message.length > 2000) return NextResponse.json({ ok: false, error: "Mesaj 1-2000 karakter olmalı." }, { status: 400 });
  if (ctx.direction === "ADMIN" && !ctx.computer.deviceCredential?.isActive) {
    return NextResponse.json({ ok: false, error: "Cihaz henüz güvenli olarak kaydedilmemiş. Önce cihaz eşleştirmesi gerekir." }, { status: 409 });
  }
  if (ctx.direction === "ADMIN" && ctx.computer.deviceChatAssignment?.assigneeId && ctx.computer.deviceChatAssignment.assigneeId !== ctx.user.id) {
    return NextResponse.json({ ok: false, error: "Bu sohbet başka bir yönetici tarafından üstlenilmiş. Yanıtlamak için yönetici devralması gerekir." }, { status: 409 });
  }
  if (ctx.direction === "ADMIN" && !ctx.computer.deviceChatAssignment) {
    try { await prisma.deviceConversationAssignment.create({ data: { computerId: ctx.computer.id, assigneeId: ctx.user.id } }); }
    catch { return NextResponse.json({ ok: false, error: "Sohbet başka bir yönetici tarafından üstlenildi. Yenileyin." }, { status: 409 }); }
  }
  const limit = rateLimit(`device-chat:${ctx.direction}:${ctx.computer.id}:${requestIp(req)}`, 20, 60_000);
  if (!limit.allowed) return NextResponse.json({ ok: false, error: "Çok sık mesaj gönderildi. Bir dakika bekleyin." }, { status: 429 });
  const created = await prisma.deviceConversationMessage.create({ data: {
    computerId: ctx.computer.id,
    direction: ctx.direction,
    body: message,
    senderId: ctx.user?.id || null,
    senderName: ctx.direction === "ADMIN" ? (ctx.user?.name || "Teknik destek") : (ctx.computer.windowsUser || "Bu bilgisayardaki kullanıcı"),
    senderTitle: ctx.direction === "ADMIN" ? (ctx.user?.title || "Teknik destek") : "Windows kullanıcısı · kimlik doğrulanmadı",
  } });
  publishChatEvent(`device:${ctx.computer.name.toLowerCase()}`, { kind: "device-chat", computerId: ctx.computer.id });
  if (ctx.direction === "DEVICE") {
    const assignee = ctx.computer.deviceChatAssignment?.assignee;
    const assigneeAvailable = assignee?.status === "ACTIVE" && IT_ROLES.has(assignee.role) && assignee.lastActiveAt && Date.now() - assignee.lastActiveAt.getTime() < 120_000;
    const recipients = await prisma.user.findMany({
      where: { status: "ACTIVE", role: { in: ["SUPER_ADMIN", "TEKNIK_MUDUR", "TEKNIK_YONETMEN", "IT_AGENT"] }, ...(assigneeAvailable ? { id: assignee.id } : {}) },
      select: { id: true },
    });
    if (recipients.length) await prisma.notification.createMany({ data: recipients.map((recipient) => ({
      userId: recipient.id, type: "DEVICE_MESSAGE", title: `${ctx.computer.name} cihazından mesaj`,
      body: message.length > 160 ? `${message.slice(0, 160)}…` : message,
      link: `/kiosk?deviceChat=${encodeURIComponent(ctx.computer.id)}&messageId=${encodeURIComponent(created.id)}`,
      entityType: "Computer", entityId: ctx.computer.id,
    })) });
    for (const recipient of recipients) {
      publishChatEvent(recipient.id, { kind: "device-chat", computerId: ctx.computer.id });
      publishChatEvent(recipient.id, { kind: "notification" });
    }
  }
  return NextResponse.json({ ok: true, message: created });
}
