import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

const ROLES = new Set(["SUPER_ADMIN", "TEKNIK_MUDUR", "TEKNIK_YONETMEN", "IT_AGENT"]);

export async function POST(req: Request) {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role || "";
  if (!session?.user?.id || !ROLES.has(role)) return NextResponse.json({ ok: false, error: "Yetkisiz erişim." }, { status: 403 });
  const body = await req.json().catch(() => null) as { assetId?: string; userId?: string; action?: string; note?: string } | null;
  if (!body?.assetId) return NextResponse.json({ ok: false, error: "Demirbaş seçilmedi." }, { status: 400 });
  if (body.action === "return") {
    const active = await prisma.assetAssignment.findFirst({ where: { assetId: body.assetId, returnedAt: null }, orderBy: { assignedAt: "desc" } });
    if (!active) return NextResponse.json({ ok: false, error: "Aktif zimmet bulunamadı." }, { status: 404 });
    await prisma.$transaction([prisma.assetAssignment.update({ where: { id: active.id }, data: { returnedAt: new Date(), note: body.note?.slice(0, 4000) || active.note } }), prisma.asset.update({ where: { id: body.assetId }, data: { status: "IN_STOCK" } })]);
  } else {
    if (!body.userId) return NextResponse.json({ ok: false, error: "Personel seçilmedi." }, { status: 400 });
    const current = await prisma.assetAssignment.findFirst({ where: { assetId: body.assetId, returnedAt: null } });
    if (current) return NextResponse.json({ ok: false, error: "Bu demirbaş zaten zimmetli." }, { status: 409 });
    await prisma.$transaction([prisma.assetAssignment.create({ data: { assetId: body.assetId, userId: body.userId, note: body.note?.slice(0, 4000) || null } }), prisma.asset.update({ where: { id: body.assetId }, data: { status: "ASSIGNED" } })]);
  }
  await prisma.auditLog.create({ data: { actorId: session.user.id, action: body.action === "return" ? "ASSET_RETURNED" : "ASSET_ASSIGNED", entityType: "Asset", entityId: body.assetId, metadata: { userId: body.userId || null } } });
  return NextResponse.json({ ok: true });
}
