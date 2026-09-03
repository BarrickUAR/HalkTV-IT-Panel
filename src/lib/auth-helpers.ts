import { cache } from "react";
import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getDemoUser } from "@/lib/demo-auth";

/** Oturumdaki kullanıcı (yoksa null) — hafif, DB'ye gitmez. */
export async function getCurrentUser() {
  // Demo mod
  if (process.env.DEMO_MODE === "true") {
    return getDemoUser();
  }
  const session = await auth();
  return session?.user ?? null;
}

/**
 * Giriş zorunlu. Demo modda cookie'den, gerçek modda DB'den okur.
 * Oturum yoksa /login'e atar.
 */
export const requireUser = cache(async () => {
  // ─── Demo mod ────────────────────────────────────────────────
  if (process.env.DEMO_MODE === "true") {
    const demoUser = await getDemoUser();
    if (!demoUser) redirect("/login");
    return demoUser;
  }

  // ─── Gerçek mod ───────────────────────────────────────────────
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
