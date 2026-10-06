import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

const ROLES = new Set(["SUPER_ADMIN", "TEKNIK_MUDUR", "TEKNIK_YONETMEN", "IT_AGENT"]);
async function authorize() {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role || "";
  return session?.user?.id && ROLES.has(role) ? session : null;
}
const clean = (value: unknown, max = 250) => typeof value === "string" ? value.trim().slice(0, max) || null : null;

export async function GET() {
  if (!await authorize()) return NextResponse.json({ ok: false, error: "Yetkisiz erişim." }, { status: 403 });
  const assets = await prisma.asset.findMany({ orderBy: { updatedAt: "desc" }, include: { assignments: { where: { returnedAt: null }, include: { user: { select: { id: true, name: true, email: true, title: true } } } } } });
  return NextResponse.json({ ok: true, assets });
}

export async function POST(req: Request) {
  const session = await authorize();
  if (!session?.user?.id) return NextResponse.json({ ok: false, error: "Yetkisiz erişim." }, { status: 403 });
  const body = await req.json().catch(() => null) as Record<string, unknown> | null;
  const assetTag = clean(body?.assetTag, 80)?.toUpperCase();
  const type = clean(body?.type, 100);
  if (!assetTag || !type) return NextResponse.json({ ok: false, error: "Demirbaş numarası ve tür zorunludur." }, { status: 400 });
  const asset = await prisma.asset.create({ data: { assetTag, type, brand: clean(body?.brand), model: clean(body?.model), serialNumber: clean(body?.serialNumber, 150), status: clean(body?.status, 50) || "IN_STOCK", location: clean(body?.location), notes: clean(body?.notes, 4000) } });
  await prisma.auditLog.create({ data: { actorId: session.user.id, action: "ASSET_CREATED", entityType: "Asset", entityId: asset.id, metadata: { assetTag, type } } });
  return NextResponse.json({ ok: true, asset }, { status: 201 });
}
