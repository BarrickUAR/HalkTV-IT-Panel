"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireRole } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

const deptSchema = z.object({
  name: z.string().trim().min(2, "Departman adı en az 2 karakter olmalıdır.").max(100),
});

export async function createDepartmentAction(_prev: any, formData: FormData) {
  await requireRole(["IT_AGENT", "IT_LEAD", "IT_MANAGER", "SUPER_ADMIN"]);

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
    data: { name: parsed.data.name },
  });

  revalidatePath("/departments");
  revalidatePath("/inventory");
  revalidatePath("/users");
  revalidatePath("/tickets/new");
  return { ok: true };
}

export async function deleteDepartmentAction(id: string) {
  await requireRole(["IT_MANAGER", "SUPER_ADMIN"]);

  await prisma.department.delete({
    where: { id },
  });

  revalidatePath("/departments");
  revalidatePath("/inventory");
  revalidatePath("/users");
  revalidatePath("/tickets/new");
  return { ok: true };
}
