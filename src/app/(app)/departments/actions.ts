"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { formatFloor } from "@/lib/floors";

const deptSchema = z.object({
  name: z.string().trim().min(2, "Departman adı en az 2 karakter olmalıdır.").max(100),
  floor: z.string().trim().optional(),
});

export async function createDepartmentAction(_prev: any, formData: FormData) {
  await requireRole(["IT_AGENT", "TEKNIK_YONETMEN", "TEKNIK_MUDUR", "SUPER_ADMIN"]);

  const parsed = deptSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message };
  }

  const existing = await prisma.department.findUnique({
    where: { name: parsed.data.name },
  });
  if (existing) {
    return { error: "Bu departman zaten kayıtlı." };
  }

  await prisma.department.create({
    data: {
      name: parsed.data.name,
      floor: formatFloor(parsed.data.floor) || null,
    },
  });

  revalidatePath("/departments");
  revalidatePath("/inventory");
  revalidatePath("/users");
  revalidatePath("/tickets/new");
  return { ok: true };
}

export async function deleteDepartmentAction(id: string): Promise<{ok?: boolean; error?: string}> {
  await requireRole(["TEKNIK_MUDUR", "SUPER_ADMIN"]);

  try {
    await prisma.department.delete({
      where: { id },
    });
  } catch (e: any) {
    if (e.code === "P2003") {
      return { error: "Bu departmana bağlı kullanıcılar veya envanter bulunduğu için silinemiyor." };
    }
    if (e.code === "P2025") {
      return { error: "Departman zaten silinmiş." };
    }
    return { error: "Silinirken bir hata oluştu." };
  }

  revalidatePath("/departments");
  revalidatePath("/inventory");
  revalidatePath("/users");
  revalidatePath("/tickets/new");
  return { ok: true };
}

export async function updateDepartmentAction(id: string, newName: string, newFloor?: string) {
  await requireRole(["TEKNIK_YONETMEN", "TEKNIK_MUDUR", "SUPER_ADMIN"]);

  const name = newName.trim();
  if (name.length < 2) return { error: "Departman adı en az 2 karakter olmalıdır." };

  const existing = await prisma.department.findUnique({ where: { name } });
  if (existing && existing.id !== id) {
    return { error: "Bu departman adı zaten kullanımda." };
  }

  await prisma.department.update({
    where: { id },
    data: {
      name,
      ...(newFloor !== undefined ? { floor: formatFloor(newFloor) || null } : {}),
    },
  });

  revalidatePath("/departments");
  revalidatePath("/inventory");
  revalidatePath("/users");
  revalidatePath("/tickets/new");
  return { ok: true };
}
export async function reorderDepartmentsAction(orders: { id: string; sortOrder: number }[]) {
  await requireRole(["IT_AGENT", "TEKNIK_YONETMEN", "TEKNIK_MUDUR", "SUPER_ADMIN"]);
  await prisma.$transaction(
    orders.map((o) =>
      prisma.department.update({
        where: { id: o.id },
        data: { sortOrder: o.sortOrder },
      })
    )
  );
  revalidatePath("/departments");
  revalidatePath("/inventory");
  revalidatePath("/users");
  revalidatePath("/tickets/new");
  return { ok: true };
}
