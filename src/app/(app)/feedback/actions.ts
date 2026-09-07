"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-helpers";
import { isITStaff } from "@/lib/rbac/permissions";
import { notifyMany } from "@/lib/notify";
import { createAuditLog } from "@/lib/audit";

const schema = z.object({
  type: z.enum(["COMPLAINT", "SUGGESTION"]),
  content: z.string().trim().min(5, "Lütfen içeriği detaylandırın.").max(3000),
});

export async function submitFeedbackAction(
  _prev: any,
  formData: FormData,
) {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const feedback = await prisma.feedback.create({
    data: {
      type: parsed.data.type,
      content: parsed.data.content,
    },
  });

  // IT Yöneticilerini bul
  const itStaff = await prisma.user.findMany({
    where: {
      role: { in: ["IT_AGENT", "TEKNIK_YONETMEN", "TEKNIK_MUDUR", "SUPER_ADMIN"] },
      status: "ACTIVE",
    },
    select: { id: true },
  });

  const typeLabel = parsed.data.type === "COMPLAINT" ? "Yeni Şikayet" : "Yeni Öneri";

  // Hem sistem içi bildirim, hem tarayıcı Web Push bildirimi gönder
  await notifyMany(
    itStaff.map((u) => u.id),
    {
      type: "ANNOUNCEMENT",
      title: `📩 ${typeLabel} İletildi (Anonim)`,
      body: parsed.data.content.slice(0, 100),
      link: "/feedback/inbox",
      entityType: "Feedback",
      entityId: feedback.id,
    }
  );

  // İşlem günlüğüne (Audit Log) anonim olarak kaydet
  await createAuditLog({
    actorId: null,
    action: "FEEDBACK_SUBMITTED",
    entityType: "Feedback",
    entityId: feedback.id,
    metadata: {
      type: parsed.data.type,
      summary: parsed.data.content.slice(0, 80),
    },
  });

  revalidatePath("/feedback");
  revalidatePath("/feedback/inbox");

  return { ok: true };
}

export async function markFeedbackReadAction(id: string) {
  const user = await requireUser();
  if (!isITStaff(user.role)) return { error: "Yetkisiz işlem." };

  await prisma.feedback.update({
    where: { id },
    data: { isRead: true },
  });

  await createAuditLog({
    actorId: user.id,
    action: "FEEDBACK_READ",
    entityType: "Feedback",
    entityId: id,
  });

  revalidatePath("/feedback");
  revalidatePath("/feedback/inbox");
  return { ok: true };
}

