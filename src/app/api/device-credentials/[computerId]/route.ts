import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

const ADMIN_ROLES = new Set(["SUPER_ADMIN", "TEKNIK_MUDUR"]);

export async function POST(req: Request, context: { params: Promise<{ computerId: string }> }) {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role || "";
  if (!session?.user?.id || !ADMIN_ROLES.has(role)) return NextResponse.json({ ok: false, error: "Yetkisiz erişim." }, { status: 403 });
  const { computerId } = await context.params;
  const body = await req.json().catch(() => null) as { action?: string } | null;
  if (body?.action !== "revoke") return NextResponse.json({ ok: false, error: "Geçersiz işlem." }, { status: 400 });
  const credential = await prisma.deviceCredential.update({ where: { computerId }, data: { isActive: false, rotatedAt: new Date() }, include: { computer: { select: { name: true } } } }).catch(() => null);
  if (!credential) return NextResponse.json({ ok: false, error: "Cihaz kimliği bulunamadı." }, { status: 404 });
  await prisma.auditLog.create({ data: { actorId: session.user.id, action: "DEVICE_CREDENTIAL_REVOKED", entityType: "Computer", entityId: computerId, metadata: { computerName: credential.computer.name } } });
  return NextResponse.json({ ok: true, message: "Cihaz anahtarı iptal edildi. Kiosk bir sonraki açılışta yeniden kaydolabilir." });
}
