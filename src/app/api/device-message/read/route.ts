import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveKioskUser } from "@/lib/auth-helpers";
import { authenticateDeviceRequest } from "@/lib/device-auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { id } = body;
    const user = await resolveKioskUser();

    if (!id || typeof id !== "string") {
      return NextResponse.json({ ok: false, error: "ID gerekli" }, { status: 400 });
    }

    const message = await prisma.deviceMessage.findUnique({ where: { id }, select: { id: true, computerId: true, computerName: true } });
    const computer = message ? await prisma.computer.findFirst({ where: { OR: [
      ...(message.computerId ? [{ id: message.computerId }] : []),
      { name: { equals: message.computerName, mode: "insensitive" } },
    ] }, select: { id: true, userId: true } }) : null;
    const isIT = Boolean(user && ["SUPER_ADMIN", "TEKNIK_MUDUR", "TEKNIK_YONETMEN", "IT_AGENT"].includes(user.role));
    const device = message ? await authenticateDeviceRequest(req, message.computerName) : null;
    if (!message || !computer || (!isIT && !(user && computer.userId === user.id) && device?.id !== computer.id)) {
      return NextResponse.json({ ok: false, error: "Bu bildirime erişim yetkiniz yok." }, { status: 403 });
    }
    await prisma.deviceMessage.update({
      where: { id: message.id },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("Device message read error:", error);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
