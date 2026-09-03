"use server";

import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";

export async function setDepartmentAction(department: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Oturum bulunamadı");

  if (process.env.DEMO_MODE === "true") {
    // Demo modda cookie'ye kaydet
    const jar = await cookies();
    jar.set("halktv_demo_dept", department, { path: "/", httpOnly: true });
    return { ok: true };
  }

  // DB'de güncelle
  await prisma.user.update({
    where: { id: user.id },
    data: { departmentId: department || null },
  });

  return { ok: true };
}
