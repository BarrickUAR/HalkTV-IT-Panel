"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";

export async function setDepartmentAction(department: string) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Oturum bulunamadı");

  if (process.env.DEMO_MODE === "true") {
    // Demo modda cookie'ye kaydet
    const jar = await cookies();
    jar.set("halktv_demo_dept", department, { path: "/", httpOnly: true });
    revalidatePath("/", "layout");
    return { ok: true };
  }

  // DB'de departman ID veya ismine göre bul
  let targetDeptId: string | null = null;

  const deptById = await prisma.department.findUnique({
    where: { id: department },
  });

  if (deptById) {
    targetDeptId = deptById.id;
  } else {
    const deptByName = await prisma.department.findUnique({
      where: { name: department },
    });
    if (deptByName) {
      targetDeptId = deptByName.id;
    } else {
      // Eğer yoksa yeni departman olarak oluştur ve ata
      const created = await prisma.department.create({
        data: { name: department },
      });
      targetDeptId = created.id;
    }
  }

  // Kullanıcıya departmanı bağla
  await prisma.user.update({
    where: { id: user.id },
    data: { departmentId: targetDeptId },
  });

  revalidatePath("/", "layout");
  return { ok: true };
}
