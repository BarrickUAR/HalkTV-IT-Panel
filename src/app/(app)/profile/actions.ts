"use server";

import { requireUser } from "@/lib/auth-helpers";
import { isITStaff } from "@/lib/rbac/permissions";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { revalidatePath } from "next/cache";

export type ProfileFormState = { ok?: boolean; error?: string } | undefined;

const profileSchema = z.object({
  name: z.string().trim().min(2, "Ad Soyad alanı zorunludur.").optional().or(z.literal("")),
  email: z.string().trim().email("Geçerli bir e-posta adresi giriniz.").optional().or(z.literal("")),
  departmentId: z.string().optional().or(z.literal("")),
  computerId: z.string().optional().or(z.literal("")),
  phone: z.string().trim().optional().or(z.literal("")),
});

export async function updateProfileAction(
  _prev: ProfileFormState,
  formData: FormData
): Promise<ProfileFormState> {
  const user = await requireUser();
  const parsed = profileSchema.safeParse(Object.fromEntries(formData));
  
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message };
  }

  // Mevcut kullanıcıyı çekip izin kontrolü yapalım
  const currentUserDb = await prisma.user.findUnique({
    where: { id: user.id },
    select: { name: true, email: true }
  });

  const isStaff = isITStaff(user.role);

  // Sadece IT personeli veya henüz boşsa güncellenmesine izin ver
  const finalName = (isStaff || !currentUserDb?.name) ? (parsed.data.name || currentUserDb?.name) : currentUserDb.name;
  const finalEmail = (isStaff || !currentUserDb?.email) ? (parsed.data.email || currentUserDb?.email) : currentUserDb.email;

  if (finalEmail && finalEmail !== currentUserDb?.email) {
    // Aynı email başka birinde var mı kontrolü (Sadece email değişiyorsa)
    const dup = await prisma.user.findFirst({
      where: { email: finalEmail, id: { not: user.id } },
      select: { id: true }
    });
    if (dup) {
      return { error: "Bu e-posta adresi başka bir hesap tarafından kullanılıyor." };
    }
  }

  const imageBase64 = String(formData.get("imageBase64") ?? "");

  await prisma.user.update({
    where: { id: user.id },
    data: {
      name: finalName,
      email: finalEmail,
      phone: parsed.data.phone || null,
      ...(imageBase64 ? { image: imageBase64 } : {}),
      // isStaff ise departmanı güncelle (boş string gelirse null yap = temizle)
      ...(isStaff ? { departmentId: parsed.data.departmentId || null } : {}),
    },
  });

  if (isStaff && parsed.data.computerId !== undefined) {
    const currentComputer = await prisma.computer.findFirst({ where: { userId: user.id } });
    
    if (parsed.data.computerId === "") {
      // Bilgisayarı boşa çıkar
      if (currentComputer) {
        await prisma.computer.update({
          where: { id: currentComputer.id },
          data: { userId: null }
        });
      }
    } else {
      if (!currentComputer || currentComputer.id !== parsed.data.computerId) {
         // Yeni bilgisayarı bu kullanıcıya ata
         await prisma.computer.update({
           where: { id: parsed.data.computerId },
           data: { userId: user.id }
         });
         // Eski bilgisayarı varsa boşa çıkar
         if (currentComputer) {
           await prisma.computer.update({
             where: { id: currentComputer.id },
             data: { userId: null }
           });
         }
      }
    }
  }

  revalidatePath("/profile");
  return { ok: true };
}

export async function saveSubscriptionAction(sub: { endpoint: string; keys: { p256dh: string; auth: string; } }) {
  const user = await requireUser();
  
  if (!sub.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) {
    return { error: "Geçersiz abonelik verisi." };
  }

  // Check if exists
  const existing = await prisma.pushSubscription.findUnique({
    where: { endpoint: sub.endpoint }
  });

  if (existing) {
    if (existing.userId !== user.id) {
      await prisma.pushSubscription.update({
        where: { id: existing.id },
        data: { userId: user.id, ...sub.keys }
      });
    }
  } else {
    await prisma.pushSubscription.create({
      data: {
        userId: user.id,
        endpoint: sub.endpoint,
        p256dh: sub.keys.p256dh,
        auth: sub.keys.auth,
      }
    });
  }

  return { ok: true };
}

export async function changePasswordAction(
  _prev: ProfileFormState,
  formData: FormData
): Promise<ProfileFormState> {
  const user = await requireUser();
  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (!currentPassword || !newPassword || !confirmPassword) {
    return { error: "Lütfen tüm alanları doldurun." };
  }

  if (newPassword !== confirmPassword) {
    return { error: "Yeni şifreler eşleşmiyor." };
  }

  if (newPassword.length < 8) {
    return { error: "Yeni şifre en az 8 karakter olmalıdır." };
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { passwordHash: true }
  });

  if (!dbUser?.passwordHash) {
    return { error: "Şifre bulunamadı." };
  }

  const bcrypt = await import("bcryptjs");
  const isValid = await bcrypt.compare(currentPassword, dbUser.passwordHash);

  if (!isValid) {
    return { error: "Mevcut şifreniz yanlış." };
  }

  if (currentPassword === newPassword) {
    return { error: "Yeni şifre, mevcut şifrenizle aynı olamaz." };
  }

  const newHash = await bcrypt.hash(newPassword, 10);

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: newHash }
  });

  return { ok: true };
}
