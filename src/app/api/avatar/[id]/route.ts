import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveKioskUser } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";

export async function GET(_req: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await resolveKioskUser())) return new NextResponse(null, { status: 401 });
  const { id } = await context.params;
  const user = await prisma.user.findUnique({ where: { id }, select: { image: true } });
  if (!user?.image) return new NextResponse(null, { status: 404 });
  let url: URL;
  try { url = new URL(user.image); } catch { return new NextResponse(null, { status: 400 }); }
  if (url.protocol !== "https:" || !url.hostname.endsWith("googleusercontent.com")) return new NextResponse(null, { status: 400 });
  const upstream = await fetch(url, { cache: "no-store" });
  if (!upstream.ok) return new NextResponse(null, { status: 502 });
  return new NextResponse(await upstream.arrayBuffer(), { headers: { "Content-Type": upstream.headers.get("content-type") || "image/jpeg", "Cache-Control": "private, max-age=3600" } });
}
