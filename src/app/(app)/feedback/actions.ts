"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-helpers";
import { isITStaff } from "@/lib/rbac/permissions";

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

  await prisma.feedback.create({
    data: {
      type: parsed.data.type,
      content: parsed.data.content,
    },
  });

  return { ok: true };
}

export async function markFeedbackReadAction(id: string) {
  const user = await requireUser();
  if (!isITStaff(user.role)) return { error: "Yetkisiz işlem." };

  await prisma.feedback.update({
    where: { id },
    data: { isRead: true },
  });

  revalidatePath("/feedback");
  return { ok: true };
}
