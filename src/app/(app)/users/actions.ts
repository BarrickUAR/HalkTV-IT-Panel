"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { Prisma, type Role, type UserStatus } from "@prisma/client";

import { requireRole } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { assignableRoles } from "@/lib/rbac/roles";
import { createAuditLog } from "@/lib/audit";

export type UserFormState = { ok?: boolean; error?: string; savedRole?: Role; savedStatus?: UserStatus } | undefined;

const ROLE_ENUM = z.enum([
  "EMPLOYEE",
  "IT_AGENT",
  "MANAGER",
  "TEKNIK_YONETMEN",
  "TEKNIK_MUDUR",
  "GENEL_YAYIN_YONETMENI",
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
  const actor = await requireRole(["SUPER_ADMIN", "TEKNIK_MUDUR", "TEKNIK_YONETMEN", "IT_AGENT"]);
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

  const newUser = await prisma.user.create({
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

  await createAuditLog({
    actorId: actor.id,
    action: "USER_CREATED",
    entityType: "User",
    entityId: newUser.id,
    metadata: {
      name: newUser.name,
      username: newUser.username,
      email: newUser.email,
      role: newUser.role,
    },
  });

  revalidatePath("/users");
  return { ok: true };
}

const updateSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(2, "Ad Soyad gir.").max(120),
  username: z.string().trim().toLowerCase().min(2).max(40).optional().or(z.literal("")),
  email: z.string().trim().toLowerCase().email().optional().or(z.literal("")),
  role: ROLE_ENUM,
  expectedRole: ROLE_ENUM,
  status: z.enum(["ACTIVE", "INACTIVE"]),
  title: z.string().trim().max(120).optional().or(z.literal("")),
  department: z.string().trim().max(120).optional().or(z.literal("")),
  phone: z.string().trim().max(50).optional().or(z.literal("")),
  employeeNo: z.string().trim().max(50).optional().or(z.literal("")),
  image: z.string().trim().max(1500).optional().or(z.literal("")),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
  directMessagesEnabled: z.string().optional(),
  showInLiveChat: z.string().optional(),
});

export async function updateUserAction(
  _prev: UserFormState,
  formData: FormData,
): Promise<UserFormState> {
  const actor = await requireRole(["SUPER_ADMIN", "TEKNIK_MUDUR", "TEKNIK_YONETMEN", "IT_AGENT"]);
  const parsed = updateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };

  const targetUser = await prisma.user.findUnique({ where: { id: parsed.data.id } });
  if (!targetUser) return { error: "Kullanıcı bulunamadı." };
  if (targetUser.role !== parsed.data.expectedRole) {
    return { error: "Bu kullanıcının rolü siz formu açtıktan sonra değişmiş. Sayfayı yenileyip güncel bilgilerle tekrar kaydedin." };
  }

  // Rol değişikliği varsa yetki kontrolü (aynı kalıyorsa engelleme)
  if (parsed.data.role !== targetUser.role) {
    if (actor.role !== "SUPER_ADMIN" && !assignableRoles(actor.role).includes(parsed.data.role)) {
      return { error: "Bu rolü atama yetkiniz bulunmuyor." };
    }
  }

  // Süper yönetici değilse, kendisinden yüksek yetkili kullanıcıları düzenleyemesin
  if (actor.role !== "SUPER_ADMIN" && targetUser.id !== actor.id && !assignableRoles(actor.role).includes(targetUser.role)) {
    return { error: "Bu kullanıcının mevcut yetkisi sizin yetkinizden yüksek olduğu için işlem yapamazsınız." };
  }

  // Kendi hesabını düzenlerken Süper Yönetici haricindekiler kendi rolünü düşüremez veya pasife alamaz
  if (
    parsed.data.id === actor.id &&
    actor.role !== "SUPER_ADMIN" &&
    (parsed.data.status !== "ACTIVE" || parsed.data.role !== actor.role)
  ) {
    return { error: "Kendi rolünüzü veya hesap durumunuzu buradan değiştiremezsiniz." };
  }

  // E-posta veya Kullanıcı adı değiştiyse mükerrerlik kontrolü
  if (parsed.data.username && parsed.data.username !== targetUser.username) {
    const dupUser = await prisma.user.findFirst({
      where: { username: parsed.data.username, id: { not: targetUser.id } },
    });
    if (dupUser) return { error: "Bu kullanıcı adı başka bir kullanıcı tarafından kullanılıyor." };
  }

  if (parsed.data.email && parsed.data.email !== targetUser.email) {
    const dupEmail = await prisma.user.findFirst({
      where: { email: parsed.data.email, id: { not: targetUser.id } },
    });
    if (dupEmail) return { error: "Bu e-posta başka bir kullanıcı tarafından kullanılıyor." };
  }

  let updatedUser;
  try {
    updatedUser = await prisma.user.update({
    // Check again atomically: another request may have changed the role after the read.
    where: { id: parsed.data.id, role: parsed.data.expectedRole },
    data: {
      name: parsed.data.name,
      username: parsed.data.username || undefined,
      email: parsed.data.email || undefined,
      title: parsed.data.title || null,
      role: parsed.data.role,
      status: parsed.data.status,
      departmentId: parsed.data.department || null,
      phone: parsed.data.phone || null,
      employeeNo: parsed.data.employeeNo || null,
      notes: parsed.data.notes || null,
      directMessagesEnabled: parsed.data.directMessagesEnabled === "on",
      showInLiveChat: parsed.data.showInLiveChat === "on",
    },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return { error: "Kullanıcı bilgileri başka bir işlemde değişti. Sayfayı yenileyip tekrar deneyin." };
    }
    console.error("User update failed", error);
    return { error: "Kullanıcı kaydedilemedi. Lütfen tekrar deneyin." };
  }

  // Bilgisayar doğrudan profil formundan değiştirildiyse güncelle
  const computerIdParam = formData.get("computerId");
  if (computerIdParam !== null && computerIdParam !== undefined) {
    const compId = String(computerIdParam).trim();
    if (compId === "") {
      // Bağlantıyı kaldır
      await prisma.computer.updateMany({
        where: { userId: targetUser.id },
        data: { userId: null },
      });
    } else {
      // Seçilen bilgisayarı bu kullanıcıya bağla
      await prisma.computer.update({
        where: { id: compId },
        data: { userId: targetUser.id, departmentId: parsed.data.department || null },
      });
    }
  }

  await createAuditLog({
    actorId: actor.id,
    action: "USER_UPDATED",
    entityType: "User",
    entityId: updatedUser.id,
    metadata: {
      name: updatedUser.name,
      oldRole: targetUser.role,
      newRole: updatedUser.role,
      oldStatus: targetUser.status,
      newStatus: updatedUser.status,
      directMessagesEnabled: updatedUser.directMessagesEnabled,
    },
  });

  revalidatePath("/users");
  revalidatePath(`/users/${parsed.data.id}`);
  return { ok: true, savedRole: updatedUser.role, savedStatus: updatedUser.status };
}

export async function assignComputerAction(
  _prev: UserFormState,
  formData: FormData,
): Promise<UserFormState> {
  const actor = await requireRole(["SUPER_ADMIN", "TEKNIK_MUDUR", "TEKNIK_YONETMEN", "IT_AGENT"]);
  const userId = String(formData.get("userId") ?? "").trim();
  const computerId = String(formData.get("computerId") ?? "").trim();
  const computerName = String(formData.get("computerName") ?? "").trim();

  if (!userId) return { error: "Kullanıcı ID gerekli." };
  if (!computerId && !computerName) return { error: "Bilgisayar seçin veya adını girin." };

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, departmentId: true },
  });
  if (!user) return { error: "Kullanıcı bulunamadı." };

  if (computerId) {
    await prisma.computer.update({
      where: { id: computerId },
      data: { userId: user.id, departmentId: user.departmentId ?? undefined },
    });
  } else if (computerName) {
    await prisma.computer.upsert({
      where: { name: computerName },
      create: {
        name: computerName,
        userId: user.id,
        departmentId: user.departmentId ?? undefined,
        notes: `Manuel atandı: ${user.name || user.id} (${new Date().toLocaleString("tr-TR")})`,
      },
      update: {
        userId: user.id,
        departmentId: user.departmentId ?? undefined,
      },
    });
  }

  await createAuditLog({
    actorId: actor.id,
    action: "COMPUTER_ASSIGNED",
    entityType: "Computer",
    entityId: computerId || computerName,
    metadata: { userId: user.id, userName: user.name, computerName: computerName || computerId },
  });

  revalidatePath(`/users/${userId}`);
  revalidatePath("/inventory");
  return { ok: true };
}

export async function unlinkComputerAction(
  _prev: UserFormState,
  formData: FormData,
): Promise<UserFormState> {
  const actor = await requireRole(["SUPER_ADMIN", "TEKNIK_MUDUR", "TEKNIK_YONETMEN", "IT_AGENT"]);
  const computerId = String(formData.get("computerId") ?? "").trim();
  const userId = String(formData.get("userId") ?? "").trim();

  if (!computerId) return { error: "Bilgisayar ID gerekli." };

  await prisma.computer.update({
    where: { id: computerId },
    data: { userId: null },
  });

  await createAuditLog({
    actorId: actor.id,
    action: "COMPUTER_UNLINKED",
    entityType: "Computer",
    entityId: computerId,
    metadata: { userId },
  });

  if (userId) revalidatePath(`/users/${userId}`);
  revalidatePath("/inventory");
  return { ok: true };
}

export async function resetPasswordAction(
  _prev: UserFormState,
  formData: FormData,
): Promise<UserFormState> {
  const actor = await requireRole(["SUPER_ADMIN", "TEKNIK_MUDUR", "TEKNIK_YONETMEN", "IT_AGENT"]);
  const id = String(formData.get("id") ?? "");
  const password = String(formData.get("password") ?? "");
  if (password.length < 8) return { error: "Şifre en az 8 karakter olmalı." };

  const targetUser = await prisma.user.findUnique({ where: { id } });
  if (!targetUser) return { error: "Kullanıcı bulunamadı." };

  if (actor.role !== "SUPER_ADMIN" && targetUser.role === "SUPER_ADMIN") {
    return { error: "Sistem Yöneticisi şifresini sadece başka bir Sistem Yöneticisi değiştirebilir." };
  }

  await prisma.user.update({
    where: { id },
    data: { passwordHash: await bcrypt.hash(password, 10) },
  });

  await createAuditLog({
    actorId: actor.id,
    action: "PASSWORD_RESET",
    entityType: "User",
    entityId: targetUser.id,
    metadata: {
      name: targetUser.name,
      email: targetUser.email,
    },
  });

  return { ok: true };
}
