"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";

const computerSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2, "Bilgisayar adı en az 2 karakter olmalıdır.").max(100),
  departmentId: z.string().optional().nullable(),
  userId: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function saveComputerAction(_prev: any, formData: FormData) {
  const actor = await requireRole(["IT_AGENT", "TEKNIK_YONETMEN", "TEKNIK_MUDUR", "SUPER_ADMIN"]);

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
    const updated = await prisma.computer.update({
      where: { id },
      data: {
        name,
        departmentId: departmentId || null,
        userId: userId || null,
        notes: notes || null,
      },
      include: { user: { select: { name: true } }, department: { select: { name: true } } },
    });

    await createAuditLog({
      actorId: actor.id,
      action: "COMPUTER_UPDATED",
      entityType: "Computer",
      entityId: updated.id,
      metadata: {
        name: updated.name,
        assignedUser: updated.user?.name || "Boşta",
        department: updated.department?.name || "Belirtilmemiş",
      },
    });
  } else {
    // Yeni Ekleme
    const created = await prisma.computer.create({
      data: {
        name,
        departmentId: departmentId || null,
        userId: userId || null,
        notes: notes || null,
      },
      include: { user: { select: { name: true } }, department: { select: { name: true } } },
    });

    await createAuditLog({
      actorId: actor.id,
      action: "COMPUTER_CREATED",
      entityType: "Computer",
      entityId: created.id,
      metadata: {
        name: created.name,
        assignedUser: created.user?.name || "Boşta",
        department: created.department?.name || "Belirtilmemiş",
      },
    });
  }

  revalidatePath("/inventory");
  revalidatePath("/profile");
  return { ok: true };
}

export async function deleteComputerAction(id: string) {
  const actor = await requireRole(["TEKNIK_MUDUR", "SUPER_ADMIN"]);

  const comp = await prisma.computer.findUnique({ where: { id } });
  if (comp) {
    await prisma.computer.delete({
      where: { id },
    });

    await createAuditLog({
      actorId: actor.id,
      action: "COMPUTER_DELETED",
      entityType: "Computer",
      entityId: id,
      metadata: {
        name: comp.name,
      },
    });
  }

  revalidatePath("/inventory");
  revalidatePath("/profile");
  return { ok: true };
}
