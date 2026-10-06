"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { publishChatEvent } from "@/lib/chat-events";

const sendMessageSchema = z.object({
  computerId: z.string().optional(),
  computerName: z.string().min(1, "Bilgisayar adı belirtilmelidir."),
  title: z.string().optional(),
  message: z.string().trim().min(2, "Mesaj en az 2 karakter olmalıdır.").max(1000, "Mesaj en fazla 1000 karakter olabilir."),
  urgent: z.boolean().optional().default(false),
});

export async function sendComputerMessageAction(input: z.infer<typeof sendMessageSchema>) {
  try {
    const sender = await requireRole(["IT_AGENT", "TEKNIK_YONETMEN", "TEKNIK_MUDUR", "SUPER_ADMIN"]);

    const parsed = sendMessageSchema.safeParse(input);
    if (!parsed.success) {
      return { ok: false, error: parsed.error.issues[0]?.message || "Geçersiz veri." };
    }

    const { computerId, computerName, title, message, urgent } = parsed.data;

    // Hedef bilgisayarı veritabanında bul
    const computer = await prisma.computer.findFirst({
      where: {
        OR: [
          computerId ? { id: computerId } : undefined,
          { name: { equals: computerName, mode: "insensitive" } },
        ].filter(Boolean) as any,
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    const senderTitle = sender.title?.trim() || "IT Birimi";
    const msgTitle = title?.trim() || (urgent ? `Acil IT Uyarısı (${senderTitle})` : `${sender.name || "IT Ekibi"} • ${senderTitle}`);

    // 1. Cihaza özel DeviceMessage oluştur (Kiosk doğrudan bu mesajı çeker)
    const deviceMsg = await prisma.deviceMessage.create({
      data: {
        computerId: computer?.id ?? computerId ?? null,
        computerName: computer?.name ?? computerName,
        senderId: sender.id,
        title: msgTitle,
        message: message,
        urgent: !!urgent,
      },
    });
    publishChatEvent(`device:${(computer?.name ?? computerName).toLowerCase()}`, { kind: "notification" });

    // 2. Hedef kullanıcının tespiti (Audit log için)
    let targetUserId = computer?.userId;
    if (!targetUserId && computer?.notes) {
      const winUserMatch = computer.notes.match(/Windows:\s*([^\s|]+)/)?.[1]?.trim();
      if (winUserMatch && winUserMatch !== "-") {
        const foundUser = await prisma.user.findFirst({
          where: {
            OR: [
              { username: { equals: winUserMatch, mode: "insensitive" } },
              { email: { startsWith: winUserMatch, mode: "insensitive" } },
              { name: { contains: winUserMatch, mode: "insensitive" } },
            ],
          },
          select: { id: true },
        });
        if (foundUser) targetUserId = foundUser.id;
      }
    }

    // 3. Audit Log kaydı
    await createAuditLog({
      actorId: sender.id,
      action: "COMPUTER_MESSAGE_SENT",
      entityType: "Computer",
      entityId: computer?.id || computerName,
      metadata: {
        computerName: computer?.name ?? computerName,
        message,
        urgent,
        targetUserId: targetUserId ?? null,
      },
    });

    revalidatePath("/dashboard");
    revalidatePath("/inventory");

    return {
      ok: true,
      messageId: deviceMsg.id,
      computerName: computer?.name ?? computerName,
      recipientUser: computer?.user?.name || null,
    };
  } catch (error: any) {
    console.error("sendComputerMessageAction error:", error);
    return { ok: false, error: error.message || "Mesaj iletilemedi." };
  }
}
