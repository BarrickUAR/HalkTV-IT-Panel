import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme-toggle";

import { AuthPanel } from "./auth-panel";

export const metadata: Metadata = {
  title: "Giriş",
};

export default function LoginPage() {
  const year = new Date().getFullYear();

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      {/* Marka paneli — büyük HalkTV logosu, koyu zemin */}
      <div className="relative hidden flex-col items-center justify-center bg-zinc-950 p-12 text-white lg:flex">
        <div className="flex flex-col items-center text-center">
          <Image
            src="/halktv-logo.png"
            alt="Halk TV"
            width={116}
            height={150}
            priority
            className="h-48 w-auto"
          />
          <h2 className="mt-10 text-4xl font-bold tracking-tight">
            HalkTV Teknik Destek
          </h2>
        </div>

        <div className="absolute inset-x-0 bottom-8 text-center text-xs text-white/40">
          © {year} HalkTV
        </div>
      </div>

      {/* Giriş tarafı */}
      <div className="flex flex-col">
        <div className="flex items-center justify-between p-6 lg:justify-end">
          <Link href="/login" className="lg:hidden">
            <Logo />
          </Link>
          <ThemeToggle />
        </div>
        <div className="flex flex-1 items-center justify-center px-6 pb-16">
          <AuthPanel />
        </div>
      </div>
    </div>
  );
}
