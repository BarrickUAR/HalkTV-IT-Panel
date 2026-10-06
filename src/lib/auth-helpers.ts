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
      title: true,
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

/**
 * Kiosk / API kimlik doğrulama yardımcısı.
 * 1. Web session (NextAuth JWT)
 * 2. Explicit userId
 * 3. Hostname (Bilgisayara zimmetli kullanıcı)
 * 4. Windows username (User.username veya email prefix)
 */
export async function resolveKioskUser(params?: {
  userId?: string | null;
  hostname?: string | null;
  username?: string | null;
}) {
  // 1. Web Session
  const session = await auth();
  if (session?.user?.id) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        role: true,
        status: true,
        title: true,
        departmentId: true,
        department: { select: { id: true, name: true } },
      },
    });
    if (user && user.status === "ACTIVE") return user;
  }

  // A user ID, hostname or Windows username is not proof of authentication.
  return null;
}
