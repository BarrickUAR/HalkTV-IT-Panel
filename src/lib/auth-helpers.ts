import { cache } from "react";
import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/** Oturumdaki kullanıcı (yoksa null) — hafif, DB'ye gitmez. */
export async function getCurrentUser() {
  const session = await auth();
  return session?.user ?? null;
}

/**
 * Giriş zorunlu. Oturumu NextAuth + DB üzerinden doğrular.
 * Oturum yoksa /login'e yönlendirir.
 */
export const requireUser = cache(async () => {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      role: true,
      status: true,
      departmentId: true,
      department: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (!user || user.status !== "ACTIVE") redirect("/login");
  return user;
});

/** Belirli rol(ler) zorunlu — yetkisizse panele yönlendirir. */
export async function requireRole(roles: Role[]) {
  const user = await requireUser();
  if (!roles.includes(user.role)) redirect("/dashboard");
  return user;
}
