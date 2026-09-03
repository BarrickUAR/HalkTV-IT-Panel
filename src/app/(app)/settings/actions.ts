"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import bcrypt from "bcryptjs";

import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

export type SettingsState = { ok?: boolean; error?: string } | undefined;

const profileSchema = z.object({
  name: z.string().trim().min(2, "Ad Soyad en az 2 karakter olmalı.").max(120),
  title: z.string().trim().max(120).optional().or(z.literal("")),
  phone: z.string().trim().max(30).optional().or(z.literal("")),
});

export async function updateProfile(
  _prev: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const user = await requireUser();
  const parsed = profileSchema.safeParse({
    name: formData.get("name"),
    title: formData.get("title"),
    phone: formData.get("phone"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formu kontrol et." };
  }
  await prisma.user.update({
    where: { id: user.id },
    data: {
      name: parsed.data.name,
      title: parsed.data.title || null,
      phone: parsed.data.phone || null,
    },
  });
  revalidatePath("/settings");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function changePassword(
  _prev: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const user = await requireUser();
  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { passwordHash: true },
  });
  if (!dbUser?.passwordHash) {
    return { error: "E-posta ile giriş yapıyorsun; şifre gerekmiyor." };
  }

  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  if (next.length < 8) return { error: "Yeni şifre en az 8 karakter olmalı." };

  const ok = await bcrypt.compare(current, dbUser.passwordHash);
  if (!ok) return { error: "Mevcut şifre hatalı." };

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await bcrypt.hash(next, 10) },
  });
  return { ok: true };
}
