import { randomBytes } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { tokenHash } from "@/lib/device-auth";
import { rateLimit, requestIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const bootstrap = req.headers.get("x-kiosk-secret") || "";
  if (!process.env.KIOSK_API_SECRET || bootstrap !== process.env.KIOSK_API_SECRET) {
    return NextResponse.json({ ok: false, error: "Kayıt anahtarı geçersiz." }, { status: 401 });
  }
  const limited = rateLimit(`device-enroll:${requestIp(req)}`, 10, 60_000);
  if (!limited.allowed) return NextResponse.json({ ok: false, error: "Çok fazla kayıt isteği." }, { status: 429 });
  const body = await req.json().catch(() => null) as { hostname?: string } | null;
  const hostname = body?.hostname?.trim().toUpperCase();
  if (!hostname || !/^[A-Z0-9._-]{2,120}$/.test(hostname)) {
    return NextResponse.json({ ok: false, error: "Bilgisayar adı geçersiz." }, { status: 400 });
  }

  const computer = await prisma.computer.upsert({ where: { name: hostname }, create: { name: hostname, inventorySource: "KIOSK" }, update: {} });
  const current = await prisma.deviceCredential.findUnique({ where: { computerId: computer.id } });
  if (current?.isActive) {
    return NextResponse.json({ ok: false, error: "Bu cihaz daha önce kaydedilmiş. Anahtar yenilemesini yönetici yapmalıdır." }, { status: 409 });
  }
  const token = randomBytes(32).toString("base64url");
  await prisma.deviceCredential.upsert({
    where: { computerId: computer.id },
    create: { computerId: computer.id, tokenHash: tokenHash(token), tokenPrefix: token.slice(0, 8) },
    update: { tokenHash: tokenHash(token), tokenPrefix: token.slice(0, 8), isActive: true, rotatedAt: new Date() },
  });
  return NextResponse.json({ ok: true, deviceId: computer.id, deviceToken: token });
}
