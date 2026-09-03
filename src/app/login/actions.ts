"use server";

import { AuthError } from "next-auth";
import { signIn, signOut } from "@/auth";
import { signInAsDemo, signOutDemo } from "@/lib/demo-auth";

const IS_DEMO = process.env.DEMO_MODE === "true";

/** Kullanıcı adı + şifre ile giriş (useActionState imzası). */
export async function signInWithCredentials(
  _prev: string | undefined,
  formData: FormData,
): Promise<string | undefined> {
  const username = String(formData.get("username") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!username || !password) return "Kullanıcı adı ve şifre gerekli.";

  try {
    await signIn("credentials", { username, password, redirectTo: "/dashboard" });
  } catch (error) {
    if (error instanceof AuthError) return "Kullanıcı adı veya şifre hatalı.";
    throw error; // NEXT_REDIRECT dahil — yeniden fırlat
  }
}

/** Demo: IT personeli olarak giriş. */
export async function signInAsITDemo() {
  if (!IS_DEMO) return;
  await signInAsDemo("IT_MANAGER");
}

/** Demo: Çalışan olarak giriş. */
export async function signInAsEmployeeDemo() {
  if (!IS_DEMO) return;
  await signInAsDemo("EMPLOYEE");
}

export async function signOutAction() {
  if (IS_DEMO) {
    await signOutDemo();
    return;
  }
  await signOut({ redirectTo: "/login" });
}
