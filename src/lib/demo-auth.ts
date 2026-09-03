"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export type DemoRole = "IT_MANAGER" | "EMPLOYEE";

const DEMO_COOKIE = "halktv_demo_role";

/** Demo modunda cookie'den kullanıcı döner. */
export async function getDemoUser() {
  if (process.env.DEMO_MODE !== "true") return null;
  const jar = await cookies();
  const role = jar.get(DEMO_COOKIE)?.value as DemoRole | undefined;
  if (!role) return null;

  const demoDept = jar.get("halktv_demo_dept")?.value ?? null;

  if (role === "IT_MANAGER") {
    return {
      id: "demo-it-1",
      name: "Berk Yılmaz",
      email: "berk.yilmaz@halktv.com.tr",
      image: null,
      role: "IT_MANAGER" as const,
      status: "ACTIVE" as const,
      department: demoDept ?? "Teknik",
    };
  }
  return {
    id: "demo-emp-1",
    name: "Ahmet Çelik",
    email: "ahmet.celik@halktv.com.tr",
    image: null,
    role: "EMPLOYEE" as const,
    status: "ACTIVE" as const,
    department: demoDept, // Test için boş olabilir
  };
}

/** Demo girişi — cookie set edip dashboard'a yönlendirir. */
export async function signInAsDemo(role: DemoRole) {
  const jar = await cookies();
  jar.set(DEMO_COOKIE, role, {
    path: "/",
    httpOnly: true,
    maxAge: 60 * 60 * 8, // 8 saat
    sameSite: "lax",
  });
  redirect("/dashboard");
}

/** Demo çıkışı. */
export async function signOutDemo() {
  const jar = await cookies();
  jar.delete(DEMO_COOKIE);
  redirect("/login");
}
