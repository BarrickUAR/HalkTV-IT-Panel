"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { NotificationType } from "@prisma/client";

import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/rbac/permissions";
import { postToWebhook } from "@/lib/integrations";

async function guard() {
  const u = await requireUser();
  return can(u.role, "integration:manage") ? u : null;
}

const schema = z.object({
  name: z.string().trim().min(2, "İsim gir.").max(80),
  type: z.enum(["TEAMS", "SLACK"]),
  url: z.string().url("Geçerli bir webhook URL'i gir."),
});

export type IntegrationState = { error?: string; ok?: boolean } | undefined;

export async function createWebhook(
  _prev: IntegrationState,
  formData: FormData,
): Promise<IntegrationState> {
  const u = await guard();
  if (!u) return { error: "Yetkin yok." };
  const parsed = schema.safeParse({
    name: formData.get("name"),
    type: formData.get("type"),
    url: formData.get("url"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const events = formData.getAll("events") as NotificationType[];
  if (events.length === 0) return { error: "En az bir olay seç." };

  await prisma.integrationWebhook.create({
    data: {
      name: parsed.data.name,
      type: parsed.data.type,
      url: parsed.data.url,
      events,
    },
  });
  revalidatePath("/profile");
  return { ok: true };
}

export async function toggleWebhook(
  id: string,
  active: boolean,
): Promise<{ ok: boolean }> {
  const u = await guard();
  if (!u) return { ok: false };
  await prisma.integrationWebhook.update({
    where: { id },
    data: { isActive: active },
  });
  revalidatePath("/profile");
  return { ok: true };
}

export async function deleteWebhook(id: string): Promise<{ ok: boolean }> {
  const u = await guard();
  if (!u) return { ok: false };
  await prisma.integrationWebhook.delete({ where: { id } });
  revalidatePath("/profile");
  return { ok: true };
}

export async function testWebhook(id: string): Promise<{ ok: boolean }> {
  const u = await guard();
  if (!u) return { ok: false };
  const hook = await prisma.integrationWebhook.findUnique({ where: { id } });
  if (!hook) return { ok: false };
  const ok = await postToWebhook(hook.type, hook.url, {
    title: "HalkTV HelpDesk — test bildirimi",
    body: "Bu bir test mesajıdır. Entegrasyon çalışıyor. ✅",
  });
  return { ok };
}
