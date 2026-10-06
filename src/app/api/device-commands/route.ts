import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { authenticateDeviceRequest } from "@/lib/device-auth";

export const dynamic = "force-dynamic";

const IT_ROLES = ["SUPER_ADMIN", "TEKNIK_MUDUR", "TEKNIK_YONETMEN", "IT_AGENT"] as const;
const ALLOWED_COMMANDS = new Set(["RESTART", "SHUTDOWN", "RELOAD_KIOSK", "LOCK_SCREEN", "SHOW_MESSAGE", "FLUSH_DNS", "RESET_SPOOLER", "RENEW_IP", "MUTE_AUDIO", "UNMUTE_AUDIO", "SLEEP", "TAKE_SCREENSHOT"]);

// GET /api/device-commands?hostname=TEKNIK-PC
// C# client polls for pending commands
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const hostname = searchParams.get("hostname")?.trim();

    if (!hostname) {
      return NextResponse.json({ ok: false, error: "hostname is required" }, { status: 400 });
    }
    if (!await authenticateDeviceRequest(req, hostname)) {
      return NextResponse.json({ ok: false, error: "Cihaz kimliği doğrulanamadı." }, { status: 401 });
    }
    const now = new Date();
    await prisma.deviceCommand.updateMany({
      where: { status: "PENDING", expiresAt: { lt: now } },
      data: { status: "FAILED", result: "Komutun geçerlilik süresi doldu.", completedAt: now },
    });

    // Find PENDING commands for this computer or broadcast (ALL)
    const commands = await prisma.deviceCommand.findMany({
      where: {
        status: "PENDING",
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
        AND: [{ OR: [{ computerName: hostname }, { computerName: "ALL" }] }],
      },
      orderBy: { createdAt: "asc" },
    });

    if (commands.length > 0) {
      // Mark them all as RECEIVED
      await prisma.deviceCommand.updateMany({
        where: { id: { in: commands.map((c) => c.id) } },
        data: { status: "RECEIVED", receivedAt: new Date() },
      });
    }

    return NextResponse.json({ commands });
  } catch (error) {
    console.error("device-commands GET error:", error);
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
  }
}

// POST /api/device-commands
// C# client reports command result
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { commandId, status, result } = body as {
      commandId?: string;
      status?: "EXECUTING" | "DONE" | "FAILED";
      result?: string;
    };

    if (!commandId || !status || !["EXECUTING", "DONE", "FAILED"].includes(status)) {
      return NextResponse.json(
        { ok: false, error: "commandId and status (EXECUTING|DONE|FAILED) are required" },
        { status: 400 }
      );
    }
    const existingCommand = await prisma.deviceCommand.findUnique({ where: { id: commandId }, select: { computerName: true } });
    if (!existingCommand || !await authenticateDeviceRequest(req, existingCommand.computerName)) {
      return NextResponse.json({ ok: false, error: "Cihaz kimliği doğrulanamadı." }, { status: 401 });
    }

    await prisma.deviceCommand.update({
      where: { id: commandId },
      data: {
        status,
        result: result ?? null,
        completedAt: status === "DONE" || status === "FAILED" ? new Date() : null,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("device-commands POST error:", error);
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
  }
}

// PUT /api/device-commands
// IT admin creates a new command
export async function PUT(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ ok: false, error: "Oturum açmanız gerekiyor" }, { status: 401 });
    }

    const userRole = (session.user as { role?: string }).role ?? "";
    if (!IT_ROLES.includes(userRole as (typeof IT_ROLES)[number])) {
      return NextResponse.json({ ok: false, error: "Yetkisiz erişim" }, { status: 403 });
    }

    const body = await req.json();
    const { computerName, type, payload } = body as {
      computerName?: string;
      type?: string;
      payload?: string;
    };

    if (!computerName || !type) {
      return NextResponse.json(
        { ok: false, error: "computerName and type are required" },
        { status: 400 }
      );
    }
    if (!ALLOWED_COMMANDS.has(type)) {
      return NextResponse.json({ ok: false, error: "Bu uzaktan komuta güvenlik nedeniyle izin verilmiyor." }, { status: 400 });
    }
    if (payload && payload.length > 1000) {
      return NextResponse.json({ ok: false, error: "Komut parametresi çok uzun." }, { status: 400 });
    }

    const targetNames = computerName.trim().toUpperCase() === "ALL"
      ? (await prisma.computer.findMany({ where: { name: { not: "" } }, select: { name: true }, take: 1000 })).map(c => c.name)
      : [computerName.trim()];
    if (!targetNames.length) return NextResponse.json({ ok: false, error: "Komut gönderilecek kayıtlı cihaz bulunamadı." }, { status: 404 });
    const commands = await prisma.$transaction(targetNames.map(targetName => prisma.deviceCommand.create({
      data: {
        computerName: targetName,
        type: type as import("@prisma/client").DeviceCommandType,
        payload: payload ?? null,
        status: "PENDING",
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        senderId: session.user.id,
      },
    })));
    const command = commands[0];

    const actor = await prisma.user.findUnique({ where: { id: session.user.id }, select: { name: true, title: true } });
    await prisma.auditLog.create({ data: { actorId: session.user.id, action: "DEVICE_COMMAND_CREATED", entityType: "DeviceCommand", entityId: command.id, metadata: { computerName: command.computerName, commandType: command.type, actorName: actor?.name, actorTitle: actor?.title } } }).catch(() => {});

    return NextResponse.json({ ok: true, command, count: commands.length });
  } catch (error) {
    console.error("device-commands PUT error:", error);
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
  }
}
