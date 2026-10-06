import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveKioskUser } from "@/lib/auth-helpers";
import { tokenHash } from "@/lib/device-auth";
import { rateLimit, requestIp } from "@/lib/rate-limit";
import { auditLog } from "@/lib/logger";

export const dynamic = "force-dynamic";
const IT_ROLES = new Set(["SUPER_ADMIN", "TEKNIK_MUDUR", "TEKNIK_YONETMEN", "IT_AGENT"]);
const codeDigest = (value: string) => createHash("sha256").update(value).digest();

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null) as { action?: string; computerId?: string; hostname?: string; code?: string } | null;
  if (body?.action === "create") {
    const user = await resolveKioskUser();
    if (!user || !IT_ROLES.has(user.role)) return NextResponse.json({ ok: false, error: "Yönetici oturumu gerekli." }, { status: 403 });
    const limited = rateLimit(`pair-create:${user.id}`, 15, 60_000);
    if (!limited.allowed) return NextResponse.json({ ok: false, error: "Çok fazla kod üretildi." }, { status: 429 });
    const hostname = body.hostname?.trim().toUpperCase();
    if (!hostname || !/^[A-Z0-9._-]{2,120}$/.test(hostname)) return NextResponse.json({ ok: false, error: "Bilgisayar adı geçersiz." }, { status: 400 });
    const computer = await prisma.computer.upsert({ where: { name: hostname }, create: { name: hostname, inventorySource: "MANUAL" }, update: {} });
    const credential = await prisma.deviceCredential.findUnique({ where: { computerId: computer.id }, select: { isActive: true } });
    if (credential?.isActive) return NextResponse.json({ ok: false, error: "Bu cihaz zaten eşleştirilmiş. Gerekirse cihaz anahtarını yönetimden iptal edin." }, { status: 409 });
    const code = randomBytes(6).toString("hex").toUpperCase();
    const expiresAt = new Date(Date.now() + 15 * 60_000);
    await prisma.devicePairingCode.upsert({ where: { computerId: computer.id }, create: { computerId: computer.id, codeHash: codeDigest(code).toString("hex"), createdById: user.id, expiresAt }, update: { codeHash: codeDigest(code).toString("hex"), createdById: user.id, expiresAt, usedAt: null, createdAt: new Date() } });
    await auditLog({ actorId: user.id, action: "DEVICE_PAIRING_CREATED", entityType: "Computer", entityId: computer.id, meta: { hostname } });
    return NextResponse.json({ ok: true, code, hostname, expiresAt });
  }
  if (body?.action !== "claim") return NextResponse.json({ ok: false, error: "İşlem geçersiz." }, { status: 400 });
  const limited = rateLimit(`pair-claim:${requestIp(req)}`, 5, 60_000);
  if (!limited.allowed) return NextResponse.json({ ok: false, error: "Çok fazla deneme yapıldı." }, { status: 429 });
  const hostname = body.hostname?.trim().toUpperCase();
  const code = body.code?.trim().toUpperCase();
  if (!hostname || !/^[A-Z0-9._-]{2,120}$/.test(hostname) || !code || !/^[A-F0-9]{12}$/.test(code)) return NextResponse.json({ ok: false, error: "Eşleştirme bilgisi geçersiz." }, { status: 400 });
  const computer = await prisma.computer.findUnique({ where: { name: hostname }, include: { pairingCode: true, deviceCredential: { select: { isActive: true } } } });
  const pairing = computer?.pairingCode;
  const expected = Buffer.from(pairing?.codeHash || "0".repeat(64), "hex");
  if (!computer || computer.deviceCredential?.isActive || !pairing || pairing.usedAt || pairing.expiresAt <= new Date() || !timingSafeEqual(expected, codeDigest(code))) {
    return NextResponse.json({ ok: false, error: "Kod geçersiz, süresi dolmuş veya cihaz zaten eşleştirilmiş." }, { status: 403 });
  }
  const deviceToken = randomBytes(32).toString("base64url");
  const claimed = await prisma.$transaction(async (tx) => {
    const updated = await tx.devicePairingCode.updateMany({ where: { id: pairing.id, usedAt: null, expiresAt: { gt: new Date() } }, data: { usedAt: new Date() } });
    if (updated.count !== 1) return false;
    await tx.deviceCredential.upsert({ where: { computerId: computer.id }, create: { computerId: computer.id, tokenHash: tokenHash(deviceToken), tokenPrefix: deviceToken.slice(0, 8) }, update: { tokenHash: tokenHash(deviceToken), tokenPrefix: deviceToken.slice(0, 8), isActive: true, rotatedAt: new Date() } });
    return true;
  });
  if (!claimed) return NextResponse.json({ ok: false, error: "Kod daha önce kullanılmış." }, { status: 409 });
  await auditLog({ actorId: pairing.createdById, action: "DEVICE_PAIRING_CLAIMED", entityType: "Computer", entityId: computer.id, meta: { hostname } });
  return NextResponse.json({ ok: true, deviceId: computer.id, deviceToken });
}
