"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

const computerSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2, "Bilgisayar adı en az 2 karakter olmalıdır.").max(100),
  departmentId: z.string().optional().nullable(),
  userId: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function saveComputerAction(_prev: any, formData: FormData) {
  await requireRole(["IT_AGENT", "TEKNIK_YONETMEN", "TEKNIK_MUDUR", "SUPER_ADMIN"]);

  const raw = {
    id: (formData.get("id") as string) || undefined,
    name: formData.get("name") as string,
    departmentId: (formData.get("departmentId") as string) || null,
    userId: (formData.get("userId") as string) || null,
    notes: (formData.get("notes") as string) || null,
  };

  const parsed = computerSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message };
  }

  const { id, name, departmentId, userId, notes } = parsed.data;

  // Bilgisayar adı benzersizlik kontrolü (kendi ID'si hariç)
  const existing = await prisma.computer.findFirst({
    where: {
      name: { equals: name, mode: "insensitive" },
      id: id ? { not: id } : undefined,
    },
  });

  if (existing) {
    return { error: "Bu isimde bir bilgisayar zaten kayıtlı." };
  }

  if (id) {
    // Güncelleme
    await prisma.computer.update({
      where: { id },
      data: {
        name,
        departmentId: departmentId || null,
        userId: userId || null,
        notes: notes || null,
      },
    });
  } else {
    // Yeni Ekleme
    await prisma.computer.create({
      data: {
        name,
        departmentId: departmentId || null,
        userId: userId || null,
        notes: notes || null,
      },
    });
  }

  revalidatePath("/inventory");
  revalidatePath("/profile");
  return { ok: true };
}

export async function deleteComputerAction(id: string) {
  await requireRole(["TEKNIK_MUDUR", "SUPER_ADMIN"]);

  await prisma.computer.delete({
    where: { id },
  });

  revalidatePath("/inventory");
  revalidatePath("/profile");
  return { ok: true };
}
