import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveKioskUser } from "@/lib/auth-helpers";
import { publishChatEvent } from "@/lib/chat-events";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const message = (body.message || "").trim();
    const target = (body.target || "ALL").trim();
    const urgent = Boolean(body.urgent ?? true);

    if (!message) {
      return NextResponse.json({ ok: false, error: "Mesaj boş olamaz." }, { status: 400 });
    }

    const user = await resolveKioskUser({ userId: body.userId });
    if (!user || !["SUPER_ADMIN", "TEKNIK_MUDUR", "TEKNIK_YONETMEN", "IT_AGENT"].includes(user.role)) {
      return NextResponse.json({ ok: false, error: "Bu işlem için IT yetkisi gereklidir." }, { status: 403 });
    }

    const senderTitle = user.title?.trim() || "IT Birimi";
    const finalTitle = body.title?.trim() || `${user.name || "IT Birimi"} • ${senderTitle}`;
    const targets = target.toUpperCase() === "ALL"
      ? await prisma.computer.findMany({
          where: { name: { not: "" } },
          select: { id: true, name: true },
          orderBy: { updatedAt: "desc" },
          take: 500,
        })
      : await prisma.computer.findMany({
          where: { name: { equals: target, mode: "insensitive" } },
          select: { id: true, name: true },
          take: 1,
        });

    if (target.toUpperCase() === "ALL" && targets.length > 0) {
      await prisma.deviceMessage.createMany({
        data: targets.map((computer) => ({
          computerId: computer.id,
          computerName: computer.name,
          senderId: user.id,
          title: finalTitle,
          message,
          urgent,
        })),
      });
      for (const computer of targets) {
        publishChatEvent(`device:${computer.name.toLowerCase()}`, { kind: "notification" });
      }
    } else {
      const computer = targets[0];
      await prisma.deviceMessage.create({
      data: {
        computerId: computer?.id ?? null,
        computerName: computer?.name ?? target,
        senderId: user.id,
        title: finalTitle,
        message,
        urgent,
      },
      });
      publishChatEvent(`device:${(computer?.name ?? target).toLowerCase()}`, { kind: "notification" });
    }

    return NextResponse.json({
      ok: true,
      count: target.toUpperCase() === "ALL" ? targets.length : 1,
      target,
      message: "Bildirim başarıyla yayınlandı.",
    });
  } catch (error: any) {
    console.error("kiosk-admin-broadcast error:", error);
    return NextResponse.json({ ok: false, error: "Yayın sırasında hata oluştu." }, { status: 500 });
  }
}
