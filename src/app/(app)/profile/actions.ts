"use server";

import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { revalidatePath } from "next/cache";

export type ProfileFormState = { ok?: boolean; error?: string } | undefined;

const profileSchema = z.object({
  name: z.string().trim().min(2, "Ad Soyad alanı zorunludur."),
  email: z.string().trim().email("Geçerli bir e-posta adresi giriniz."),
  departmentId: z.string().min(1, "Departman seçmelisiniz."),
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

  if (process.env.DEMO_MODE !== "true") {
    // Mevcut kullanıcıyı çekip izin kontrolü yapalım
    const currentUserDb = await prisma.user.findUnique({
      where: { id: user.id },
      select: { name: true, email: true }
    });

    // Sadece henüz boşsa güncellenmesine izin ver, aksi halde eski değeri koru
    const finalName = currentUserDb?.name ? currentUserDb.name : parsed.data.name;
    const finalEmail = currentUserDb?.email ? currentUserDb.email : parsed.data.email;

    if (!currentUserDb?.email && parsed.data.email !== currentUserDb?.email) {
      // Aynı email başka birinde var mı kontrolü (Sadece email değişiyorsa)
      const dup = await prisma.user.findFirst({
        where: { email: finalEmail, id: { not: user.id } },
        select: { id: true }
      });
      if (dup) {
        return { error: "Bu e-posta adresi başka bir hesap tarafından kullanılıyor." };
      }
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        name: finalName,
        email: finalEmail,
        departmentId: parsed.data.departmentId,
        phone: parsed.data.phone || null,
      },
    });

    // Bilgisayar mantığı: Eğer kullanıcının halihazırda bir bilgisayarı varsa, yeni atamaya izin verme
    const currentComputer = await prisma.computer.findFirst({ where: { userId: user.id } });
    if (!currentComputer && parsed.data.computerId) {
       await prisma.computer.update({
         where: { id: parsed.data.computerId },
         data: { userId: user.id }
       });
    }
  }

  revalidatePath("/profile");
  return { ok: true };
}
