import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveKioskUser } from "@/lib/auth-helpers";
import { tokenHash } from "@/lib/device-auth";
import { rateLimit, requestIp } from "@/lib/rate-limit";
import { auditLog } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  // A web session cannot prove that the supplied hostname is the physical machine.
  // Keep this legacy enrollment path opt-in; new devices use an IT-issued pairing code.
  if (process.env.KIOSK_ALLOW_SELF_ENROLL !== "true") {
    return NextResponse.json({ ok: false, error: "Cihaz kaydı için teknik ekibin eşleştirme kodu gereklidir." }, { status: 403 });
  }
  const user = await resolveKioskUser();
  if (!user) return NextResponse.json({ ok: false, error: "Oturum gerekli." }, { status: 401 });
  const limited = rateLimit(`device-self-enroll:${user.id}:${requestIp(req)}`, 5, 60_000);
  if (!limited.allowed) return NextResponse.json({ ok: false, error: "Çok fazla cihaz kayıt isteği." }, { status: 429 });
  const body = await req.json().catch(() => null) as { hostname?: string; windowsUser?: string } | null;
  const hostname = body?.hostname?.trim().toUpperCase();
  if (!hostname || !/^[A-Z0-9._-]{2,120}$/.test(hostname)) return NextResponse.json({ ok: false, error: "Bilgisayar adı geçersiz." }, { status: 400 });

  const isIT = ["SUPER_ADMIN", "TEKNIK_MUDUR", "TEKNIK_YONETMEN", "IT_AGENT"].includes(user.role);
  const currentComputer = await prisma.computer.findUnique({ where: { name: hostname }, include: { deviceCredential: { select: { isActive: true } } } });
  if (currentComputer?.deviceCredential?.isActive) return NextResponse.json({ ok: false, error: "Bu bilgisayar daha önce kaydedilmiş. Teknik yönetim cihaz anahtarını yenilemelidir." }, { status: 409 });
  if (currentComputer?.userId && currentComputer.userId !== user.id && !isIT) return NextResponse.json({ ok: false, error: "Bu bilgisayar başka bir kullanıcıya zimmetli." }, { status: 403 });

  const computer = await prisma.computer.upsert({
    where: { name: hostname },
    create: { name: hostname, userId: user.id, windowsUser: body?.windowsUser?.trim().slice(0, 120) || null, inventorySource: "KIOSK" },
    update: { ...(!currentComputer?.userId ? { userId: user.id } : {}), ...(body?.windowsUser ? { windowsUser: body.windowsUser.trim().slice(0, 120) } : {}) },
  });

  const token = randomBytes(32).toString("base64url");
  await prisma.deviceCredential.upsert({
    where: { computerId: computer.id },
    create: { computerId: computer.id, tokenHash: tokenHash(token), tokenPrefix: token.slice(0, 8) },
    update: { tokenHash: tokenHash(token), tokenPrefix: token.slice(0, 8), isActive: true, rotatedAt: new Date() },
  });
  await auditLog({ actorId: user.id, action: "DEVICE_SELF_ENROLLED", entityType: "Computer", entityId: computer.id, meta: { hostname, username: body?.windowsUser || null } });
  return NextResponse.json({ ok: true, deviceId: computer.id, deviceToken: token });
}
