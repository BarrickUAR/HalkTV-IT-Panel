"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-helpers";
import { isITStaff } from "@/lib/rbac/permissions";

export async function updateFeedbackStatusAction(id: string, status: string) {
  const user = await requireUser();
  if (!isITStaff(user.role)) throw new Error("Unauthorized");

  await prisma.feedback.update({
    where: { id },
    data: { status: status as any }
  });

  revalidatePath("/feedback/inbox");
  revalidatePath(`/feedback/inbox/${id}`);
}

export async function saveAdminResponseAction(id: string, response: string) {
  const user = await requireUser();
  if (!isITStaff(user.role)) throw new Error("Unauthorized");

  await prisma.feedback.update({
    where: { id },
    data: { adminResponse: response }
  });

  revalidatePath(`/feedback/inbox/${id}`);
}

export async function addFeedbackNoteAction(feedbackId: string, content: string) {
  const user = await requireUser();
  if (!isITStaff(user.role)) throw new Error("Unauthorized");

  await prisma.feedbackNote.create({
    data: {
      content,
      feedbackId,
      authorId: user.id
    }
  });

  revalidatePath(`/feedback/inbox/${feedbackId}`);
}
