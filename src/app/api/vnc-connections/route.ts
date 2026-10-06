import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveKioskUser } from "@/lib/auth-helpers";

const IT_ROLES = new Set(["SUPER_ADMIN", "TEKNIK_MUDUR", "TEKNIK_YONETMEN", "IT_AGENT"]);

export async function POST(req: Request) {
  const user = await resolveKioskUser();
  if (!user || !IT_ROLES.has(user.role)) return NextResponse.json({ ok: false, error: "Yetkisiz erişim." }, { status: 403 });
  const body = await req.json().catch(() => null) as { action?: string; connectionId?: string; success?: boolean; error?: string; targetId?: string; targetName?: string; targetIp?: string; sourceComputerName?: string } | null;
  if (body?.action === "result") {
    if (!body.connectionId) return NextResponse.json({ ok: false, error: "Bağlantı kaydı gerekli." }, { status: 400 });
    const connection = await prisma.remoteConnection.findFirst({ where: { id: body.connectionId, actorId: user.id } });
    if (!connection) return NextResponse.json({ ok: false, error: "Bağlantı kaydı bulunamadı." }, { status: 404 });
    const status = body.success ? "VIEWER_STARTED" : "VIEWER_FAILED";
    await prisma.remoteConnection.update({ where: { id: connection.id }, data: { status, error: body.success ? null : String(body.error || "TightVNC Viewer başlatılamadı.").slice(0, 500) } });
    if (connection.targetComputerId) await prisma.computer.update({ where: { id: connection.targetComputerId }, data: { lastVncConnectionStatus: status } }).catch(() => {});
    await prisma.auditLog.create({ data: { actorId: user.id, action: body.success ? "TIGHTVNC_VIEWER_STARTED" : "TIGHTVNC_VIEWER_FAILED", entityType: "Computer", entityId: connection.targetComputerId || connection.id, metadata: { targetIp: connection.targetIp, error: body.success ? null : body.error } } }).catch(() => {});
    return NextResponse.json({ ok: true, status });
  }
  const targetIp = body?.targetIp?.trim();
  if (!targetIp || !/^[a-fA-F0-9:.]{3,64}$/.test(targetIp)) return NextResponse.json({ ok: false, error: "Geçersiz IP adresi." }, { status: 400 });
  const actor = await prisma.user.findUnique({ where: { id: user.id }, select: { name: true, title: true } });
  let computer = body?.targetId && !body.targetId.startsWith("vnc-") ? await prisma.computer.findUnique({ where: { id: body.targetId } }) : null;
  if (!computer) computer = await prisma.computer.findFirst({ where: { OR: [{ ipAddress: targetIp }, { name: body?.targetName?.trim() || "__none__" }] } });
  if (!computer && body?.targetName) {
    computer = await prisma.computer.create({ data: { name: body.targetName.trim().slice(0, 120), ipAddress: targetIp, inventorySource: "TIGHTVNC", tightVncAvailable: true } }).catch(() => null);
  }
  const now = new Date();
  const connection = await prisma.remoteConnection.create({ data: { targetComputerId: computer?.id || body?.targetId || null, targetComputerName: computer?.name || body?.targetName?.trim().slice(0, 120) || null, targetIp, sourceComputerName: body?.sourceComputerName?.trim().slice(0, 120) || null, actorId: user.id, actorName: actor?.name, actorTitle: actor?.title, status: "REQUESTED", createdAt: now } });
  if (computer) await prisma.computer.update({ where: { id: computer.id }, data: { ipAddress: computer.ipAddress || targetIp, tightVncAvailable: true, lastVncConnectedAt: now, lastVncConnectionStatus: "REQUESTED" } });
  await prisma.auditLog.create({ data: { actorId: user.id, action: "TIGHTVNC_CONNECTION_REQUESTED", entityType: "Computer", entityId: computer?.id || connection.id, metadata: { targetIp, targetName: computer?.name || body?.targetName, sourceComputerName: body?.sourceComputerName } } }).catch(() => {});
  return NextResponse.json({ ok: true, connectionId: connection.id, connectedAt: now.toISOString() });
}

export async function GET() {
  const user = await resolveKioskUser();
  if (!user || !IT_ROLES.has(user.role)) return NextResponse.json({ ok: false, error: "Yetkisiz erişim." }, { status: 403 });
  const connections = await prisma.remoteConnection.findMany({ orderBy: { createdAt: "desc" }, take: 100 });
  return NextResponse.json({ ok: true, connections });
}
