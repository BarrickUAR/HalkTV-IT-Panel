"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

import { signInWithCredentials } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="h-11 w-full text-base font-semibold" disabled={pending}>
      {pending ? "Giriş yapılıyor…" : "Giriş Yap"}
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
        <Label htmlFor="login-username">Kullanıcı adı veya E-posta</Label>
        <Input
          id="login-username"
          name="username"
          type="text"
          required
          placeholder="ör. admin veya ad@halktv.com.tr"
          className="h-11"
          autoComplete="username"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="login-password">Şifre</Label>
        <Input
          id="login-password"
          name="password"
          type="password"
          required
          placeholder="••••••••"
          className="h-11"
          autoComplete="current-password"
        />
      </div>
      {credError ? (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive font-medium">
          {credError}
        </p>
      ) : null}
      <SubmitButton />
    </form>
  );
}

export function AuthPanel() {
  return (
    <div className="w-full max-w-sm space-y-6">
      {/* Başlık */}
      <div className="space-y-1 text-center">
        <h1 className="text-2xl font-bold tracking-tight">Hoş Geldiniz</h1>
        <p className="text-sm text-muted-foreground">
          HalkTV IT teknik destek portalına giriş yapın.
        </p>
      </div>

      <CredentialsForm />

      <Divider />

      <div className="space-y-3">
        <MicrosoftButton />
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Giriş bilgileriniz yoksa IT ekibiyle iletişime geçin.
      </p>
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
        window.location.href = "/api/auth/signin/microsoft-entra-id";
      }}
      className={cn(
        "flex h-11 w-full items-center justify-center gap-3 rounded-lg border bg-background px-4 text-sm font-medium",
        "transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer",
      )}
    >
      <MicrosoftIcon />
      Kurumsal Microsoft ile devam et
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
