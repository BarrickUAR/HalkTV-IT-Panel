"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import bcrypt from "bcryptjs";

import { requireRole } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { assignableRoles } from "@/lib/rbac/roles";

export type UserFormState = { ok?: boolean; error?: string } | undefined;

const ROLE_ENUM = z.enum([
  "EMPLOYEE",
  "IT_AGENT",
  "TEKNIK_YONETMEN",
  "TEKNIK_MUDUR",
  "SUPER_ADMIN",
]);

const createSchema = z.object({
  name: z.string().trim().min(2, "Ad Soyad gir.").max(120),
  email: z.string().trim().toLowerCase().email("Geçerli e-posta gir.").regex(/@halktv\.com\.tr$/, "Sadece @halktv.com.tr uzantılı e-postalar eklenebilir."),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, "Kullanıcı adı en az 3 karakter.")
    .max(40)
    .regex(/^[a-z0-9._-]+$/, "Sadece harf, rakam ve . _ - kullan."),
  password: z.string().min(8, "Şifre en az 8 karakter."),
  role: ROLE_ENUM,
  title: z.string().trim().max(120).optional().or(z.literal("")),
  departmentId: z.string().trim().optional().or(z.literal("")),
  phone: z.string().trim().max(50).optional().or(z.literal("")),
  employeeNo: z.string().trim().max(50).optional().or(z.literal("")),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});

export async function createUserAction(
  _prev: UserFormState,
  formData: FormData,
): Promise<UserFormState> {
  const actor = await requireRole(["TEKNIK_YONETMEN", "TEKNIK_MUDUR", "SUPER_ADMIN"]);
  const parsed = createSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  if (!assignableRoles(actor.role).includes(parsed.data.role)) {
    return { error: "Bu rolü atama yetkin yok." };
  }

  const dup = await prisma.user.findFirst({
    where: {
      OR: [{ username: parsed.data.username }, { email: parsed.data.email }],
    },
    select: { id: true },
  });
  if (dup) return { error: "Bu kullanıcı adı veya e-posta zaten kayıtlı." };

  await prisma.user.create({
    data: {
      name: parsed.data.name,
      title: parsed.data.title || null,
      email: parsed.data.email,
      username: parsed.data.username,
      passwordHash: await bcrypt.hash(parsed.data.password, 10),
      role: parsed.data.role,
      status: "ACTIVE",
      departmentId: parsed.data.departmentId || null,
      phone: parsed.data.phone || null,
      employeeNo: parsed.data.employeeNo || null,
      notes: parsed.data.notes || null,
    },
  });
  revalidatePath("/users");
  return { ok: true };
}

const updateSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(2, "Ad Soyad gir.").max(120),
  role: ROLE_ENUM,
  status: z.enum(["ACTIVE", "INACTIVE"]),
  title: z.string().trim().max(120).optional().or(z.literal("")),
  department: z.string().trim().max(120).optional().or(z.literal("")),
  phone: z.string().trim().max(50).optional().or(z.literal("")),
  employeeNo: z.string().trim().max(50).optional().or(z.literal("")),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});

export async function updateUserAction(
  _prev: UserFormState,
  formData: FormData,
): Promise<UserFormState> {
  const actor = await requireRole(["TEKNIK_YONETMEN", "TEKNIK_MUDUR", "SUPER_ADMIN"]);
  const parsed = updateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  
  const targetUser = await prisma.user.findUnique({ where: { id: parsed.data.id } });
  if (!targetUser) return { error: "Kullanıcı bulunamadı." };

  if (!assignableRoles(actor.role).includes(parsed.data.role)) {
    return { error: "Bu rolü atama yetkin yok." };
  }
  
  // Prevent editing a user who currently has a role you cannot assign
  if (targetUser.id !== actor.id && !assignableRoles(actor.role).includes(targetUser.role)) {
    return { error: "Bu kullanıcının mevcut yetkisi senin yetkinden yüksek olduğu için işlem yapamazsın." };
  }
  if (
    parsed.data.id === actor.id &&
    (parsed.data.status !== "ACTIVE" || parsed.data.role !== actor.role)
  ) {
    return { error: "Kendi rolünü/durumunu buradan değiştiremezsin." };
  }

  await prisma.user.update({
    where: { id: parsed.data.id },
    data: {
      name: parsed.data.name,
      title: parsed.data.title || null,
      role: parsed.data.role,
      status: parsed.data.status,
      departmentId: parsed.data.department || null,
      phone: parsed.data.phone || null,
      employeeNo: parsed.data.employeeNo || null,
      notes: parsed.data.notes || null,
    },
  });
  revalidatePath("/users");
  revalidatePath(`/users/${parsed.data.id}`);
  return { ok: true };
}

export async function resetPasswordAction(
  _prev: UserFormState,
  formData: FormData,
): Promise<UserFormState> {
  const actor = await requireRole(["TEKNIK_YONETMEN", "TEKNIK_MUDUR", "SUPER_ADMIN"]);
  const id = String(formData.get("id") ?? "");
  const password = String(formData.get("password") ?? "");
  if (password.length < 8) return { error: "Şifre en az 8 karakter olmalı." };

  const targetUser = await prisma.user.findUnique({ where: { id } });
  if (!targetUser) return { error: "Kullanıcı bulunamadı." };
  
  if (targetUser.id !== actor.id && !assignableRoles(actor.role).includes(targetUser.role)) {
    return { error: "Bu kullanıcının yetkisi seninkinden yüksek, şifresini sıfırlayamazsın." };
  }

  await prisma.user.update({
    where: { id },
    data: { passwordHash: await bcrypt.hash(password, 10) },
  });
  return { ok: true };
}
