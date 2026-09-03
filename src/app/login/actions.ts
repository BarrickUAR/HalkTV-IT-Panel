"use server";

import { AuthError } from "next-auth";
import { signIn, signOut } from "@/auth";

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
    if (error instanceof AuthError) {
      if (error.cause?.err?.message) {
        return error.cause.err.message;
      }
      return "Kullanıcı adı veya şifre hatalı.";
    }
    throw error; // NEXT_REDIRECT dahil — yeniden fırlat
  }
}

export async function signOutAction() {
  await signOut({ redirectTo: "/login" });
}
