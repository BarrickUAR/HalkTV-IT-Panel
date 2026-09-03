import { redirect } from "next/navigation";

import { auth } from "@/auth";

// Kök: oturum varsa panele, yoksa giriş ekranına yönlendir.
export default async function RootPage() {
  const session = await auth();
  redirect(session?.user ? "/dashboard" : "/login");
}
