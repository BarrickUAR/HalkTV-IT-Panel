"use client";

import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { changePassword, updateProfile } from "./actions";

function SaveButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="h-10">
      {pending ? "Kaydediliyor…" : label}
    </Button>
  );
}

export function ProfileForm({
  name,
  title,
  phone,
}: {
  name: string;
  title: string;
  phone: string;
}) {
  const [state, action] = useActionState(updateProfile, undefined);
  useEffect(() => {
    if (state?.ok) toast.success("Profil güncellendi.");
  }, [state]);

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Ad Soyad</Label>
        <Input
          id="name"
          name="name"
          defaultValue={name}
          placeholder="Ad Soyad"
          className="h-10"
        />
        <p className="text-xs text-muted-foreground">
          Girdiğin ad, talep ve zimmet kayıtlarında herkese bu şekilde görünür.
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="title">Ünvan (opsiyonel)</Label>
        <Input
          id="title"
          name="title"
          defaultValue={title}
          placeholder="ör. Muhasebe Uzmanı"
          className="h-10"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="phone">Telefon (opsiyonel)</Label>
        <Input
          id="phone"
          name="phone"
          defaultValue={phone}
          placeholder="5xx xxx xx xx"
          className="h-10"
        />
      </div>
      {state?.error ? (
        <p className="text-sm text-destructive">{state.error}</p>
      ) : null}
      <SaveButton label="Kaydet" />
    </form>
  );
}

export function PasswordForm() {
  const [state, action] = useActionState(changePassword, undefined);
  useEffect(() => {
    if (state?.ok) toast.success("Şifre güncellendi.");
  }, [state]);

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="current">Mevcut şifre</Label>
        <Input id="current" name="current" type="password" className="h-10" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="next">Yeni şifre</Label>
        <Input
          id="next"
          name="next"
          type="password"
          className="h-10"
          placeholder="En az 8 karakter"
        />
      </div>
      {state?.error ? (
        <p className="text-sm text-destructive">{state.error}</p>
      ) : null}
      <SaveButton label="Şifreyi Değiştir" />
    </form>
  );
}
