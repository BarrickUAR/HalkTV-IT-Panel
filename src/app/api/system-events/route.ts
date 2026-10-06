import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { authenticateDeviceRequest } from "@/lib/device-auth";

export const dynamic = "force-dynamic";

const IT_ROLES = ["SUPER_ADMIN", "TEKNIK_MUDUR", "TEKNIK_YONETMEN", "IT_AGENT"] as const;

// POST /api/system-events
// C# client reports a system event — no auth required
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const hostname = (body.hostname ?? body.Hostname)?.trim();
    const eventType = (body.eventType ?? body.EventType)?.trim();
    const detail = (body.detail ?? body.Detail)?.trim() || null;

    if (!hostname || !eventType || hostname.length > 120 || eventType.length > 80 || (detail?.length ?? 0) > 4000) {
      return NextResponse.json(
        { ok: false, error: "hostname and eventType are required" },
        { status: 400 }
      );
    }
    if (!await authenticateDeviceRequest(req, hostname)) {
      return NextResponse.json({ ok: false, error: "Cihaz kimliği doğrulanamadı." }, { status: 401 });
    }

    await prisma.systemEvent.create({
      data: {
        computerName: hostname,
        eventType,
        detail,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("system-events POST error:", error);
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
  }
}

// GET /api/system-events?hostname=TEKNIK-PC&limit=50
// IT admin reads recent system events
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ ok: false, error: "Oturum açmanız gerekiyor" }, { status: 401 });
    }

    const userRole = (session.user as { role?: string }).role ?? "";
    if (!IT_ROLES.includes(userRole as (typeof IT_ROLES)[number])) {
      return NextResponse.json({ ok: false, error: "Yetkisiz erişim" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const hostname = searchParams.get("hostname")?.trim() || undefined;
    const limit = Math.min(Number(searchParams.get("limit") ?? 50), 200);

    const events = await prisma.systemEvent.findMany({
      where: hostname ? { computerName: hostname } : undefined,
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return NextResponse.json({ ok: true, events });
  } catch (error) {
    console.error("system-events GET error:", error);
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
  }
}
