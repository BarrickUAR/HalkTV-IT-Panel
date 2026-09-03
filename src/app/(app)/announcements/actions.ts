"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/rbac/permissions";

async function guard() {
  const user = await requireUser();
  if (!can(user.role, "announcement:manage")) return null;
  return user;
}

const schema = z.object({
  title: z.string().trim().min(3, "Başlık en az 3 karakter.").max(160),
  body: z.string().trim().max(1000).optional().or(z.literal("")),
  level: z.enum(["INFO", "WARNING", "OUTAGE"]),
});

export type AnnouncementState = { error?: string; ok?: boolean } | undefined;

export async function createAnnouncement(
  _prev: AnnouncementState,
  formData: FormData,
): Promise<AnnouncementState> {
  const user = await guard();
  if (!user) return { error: "Yetkin yok." };
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  await prisma.announcement.create({
    data: {
      title: parsed.data.title,
      body: parsed.data.body || "",
      level: parsed.data.level,
      createdById: user.id,
    },
  });
  revalidatePath("/announcements");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function setAnnouncementActive(
  id: string,
  isActive: boolean,
): Promise<{ ok: boolean }> {
  const user = await guard();
  if (!user) return { ok: false };
  await prisma.announcement.update({ where: { id }, data: { isActive } });
  revalidatePath("/announcements");
  return { ok: true };
}
