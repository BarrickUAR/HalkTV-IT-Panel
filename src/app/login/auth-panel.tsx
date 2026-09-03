"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { HiOutlineArrowRight, HiOutlineComputerDesktop, HiOutlineUser } from "react-icons/hi2";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

import { signInWithCredentials, signInAsITDemo, signInAsEmployeeDemo } from "./actions";

// ─── Gerçek giriş formu ───────────────────────────────────────────────────────

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="h-11 w-full" disabled={pending}>
      {pending ? "Giriş yapılıyor…" : "Giriş yap"}
    </Button>
  );
}

function CredentialsForm() {
  const [credError, credAction] = useActionState(
    signInWithCredentials,
    undefined,
  );

  return (
    <form action={credAction} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="username">Kullanıcı adı</Label>
        <Input
          id="username"
          name="username"
          required
          autoFocus
          placeholder="ör. berk"
          className="h-11"
          autoComplete="username"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Şifre</Label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          placeholder="••••••••"
          className="h-11"
          autoComplete="current-password"
        />
      </div>
      {credError ? (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {credError}
        </p>
      ) : null}
      <SubmitButton />
    </form>
  );
}

// ─── Demo butonları ────────────────────────────────────────────────────────────

function DemoButtons() {
  return (
    <div className="grid grid-cols-2 gap-3">
      <form action={signInAsITDemo} className="w-full">
        <button
          type="submit"
          className={cn(
            "group flex h-full w-full flex-col items-center gap-3 rounded-xl border-2 border-dashed p-4 text-center transition-all",
            "border-primary/30 hover:border-primary hover:bg-primary/5",
            "active:scale-95",
          )}
        >
          <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors shadow-sm">
            <HiOutlineComputerDesktop className="size-6" />
          </div>
          <div>
            <p className="text-sm font-semibold">IT Personeli</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Yönetici Paneli</p>
          </div>
        </button>
      </form>

      <form action={signInAsEmployeeDemo} className="w-full">
        <button
          type="submit"
          className={cn(
            "group flex h-full w-full flex-col items-center gap-3 rounded-xl border-2 border-dashed p-4 text-center transition-all",
            "border-muted-foreground/20 hover:border-foreground/40 hover:bg-muted/60",
            "active:scale-95",
          )}
        >
          <div className="flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground group-hover:bg-foreground/10 transition-colors shadow-sm">
            <HiOutlineUser className="size-6" />
          </div>
          <div>
            <p className="text-sm font-semibold">Çalışan</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Talep Portalı</p>
          </div>
        </button>
      </form>
    </div>
  );
}

// ─── Ana bileşen ───────────────────────────────────────────────────────────────

const IS_DEMO = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

export function AuthPanel() {
  return (
    <div className="w-full max-w-sm space-y-6">
      {/* Başlık */}
      <div className="space-y-1 text-center">
        <h1 className="text-2xl font-bold tracking-tight">Hoş Geldiniz</h1>
        <p className="text-sm text-muted-foreground">
          IT destek portalına giriş yapın.
        </p>
      </div>

      <CredentialsForm />
      
      <Divider />
      
      <div className="space-y-3">
        <MicrosoftButton />
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Hesabınız yoksa IT ekibiyle iletişime geçin.
      </p>

      {/* Demo modu aktifse alta bilgi kutusu olarak koy */}
      {IS_DEMO && (
        <div className="mt-8 rounded-xl border bg-muted/30 p-4">
          <div className="mb-3">
            <p className="text-sm font-semibold">Demo Modu Aktif</p>
            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
              Şu an veritabanı bağlantısı yok. Sistemi test etmek için şifre girmeden aşağıdaki rollerle devam edebilirsiniz.
            </p>
          </div>
          <DemoButtons />
        </div>
      )}
    </div>
  );
}

function Divider() {
  return (
    <div className="relative py-1 text-center">
      <span className="relative z-10 bg-background px-3 text-xs text-muted-foreground">
        veya
      </span>
      <span className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-border" />
    </div>
  );
}

function MicrosoftButton() {
  return (
    <button
      type="button"
      onClick={() => {
        /* Microsoft Entra ID OAuth — yakında aktif */
        window.location.href = "/api/auth/signin/microsoft-entra-id";
      }}
      className={cn(
        "flex h-11 w-full items-center justify-center gap-3 rounded-lg border bg-background px-4 text-sm font-medium",
        "transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      )}
    >
      <MicrosoftIcon />
      Kurumsal hesapla devam et
    </button>
  );
}

function MicrosoftIcon() {
  return (
    <svg viewBox="0 0 21 21" className="size-4 shrink-0" aria-hidden="true">
      <rect x="1" y="1" width="9" height="9" fill="#f25022" />
      <rect x="11" y="1" width="9" height="9" fill="#00a4ef" />
      <rect x="1" y="11" width="9" height="9" fill="#7fba00" />
      <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
    </svg>
  );
}
