import { NextRequest, NextResponse } from "next/server";
import { resolveKioskUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get("userId");
    const hostname = url.searchParams.get("hostname");
    const username = url.searchParams.get("username");

    const user = await resolveKioskUser({ userId, hostname, username });
    if (!user) {
      return NextResponse.json({ ok: true, notifications: [] });
    }

    const notifications = await prisma.notification.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 40,
      select: {
        id: true,
        title: true,
        body: true,
        link: true,
        entityId: true,
        type: true,
        isRead: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ ok: true, notifications });
  } catch (error) {
    return NextResponse.json({ ok: false, error: "Bildirimler yüklenemedi." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, id, userId, hostname, username } = body;

    const user = await resolveKioskUser({ userId, hostname, username });
    if (!user) {
      return NextResponse.json({ ok: false, error: "Giriş yapmanız gerekiyor." }, { status: 401 });
    }

    if (action === "mark_all_read") {
      await prisma.notification.updateMany({
        where: { userId: user.id, isRead: false },
        data: { isRead: true, readAt: new Date() },
      });
      return NextResponse.json({ ok: true });
    }

    if (action === "mark_read" && id) {
      const result = await prisma.notification.updateMany({
        where: { id, userId: user.id },
        data: { isRead: true, readAt: new Date() },
      });
      if (!result.count) return NextResponse.json({ ok: false, error: "Bildirim bulunamadı." }, { status: 404 });
      return NextResponse.json({ ok: true });
    }

    if (action === "delete" && id) {
      const result = await prisma.notification.deleteMany({ where: { id, userId: user.id } });
      if (!result.count) return NextResponse.json({ ok: false, error: "Bildirim bulunamadı." }, { status: 404 });
      return NextResponse.json({ ok: true });
    }

    if (action === "delete_all") {
      await prisma.notification.deleteMany({ where: { userId: user.id } });
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: false, error: "Geçersiz işlem." }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ ok: false, error: "İşlem gerçekleştirilemedi." }, { status: 500 });
  }
}
