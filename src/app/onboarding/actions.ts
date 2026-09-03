"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

export type OnboardingState = { ok: boolean; error: string } | undefined;

export async function completeOnboarding(
  prevState: OnboardingState,
  formData: FormData
): Promise<OnboardingState> {
  const me = await requireUser();

  const name = (formData.get("name") as string | null)?.trim();
  const phone = (formData.get("phone") as string | null)?.trim() || null;
  const departmentId = (formData.get("departmentId") as string | null)?.trim() || null;

  if (!name) {
    return { ok: false, error: "Ad Soyad zorunludur." };
  }

  await prisma.user.update({
    where: { id: me.id },
    data: {
      name,
      phone: phone ?? undefined,
      departmentId: departmentId ?? undefined,
    },
  });

  redirect("/dashboard");
}
