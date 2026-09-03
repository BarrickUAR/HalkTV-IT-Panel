"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import { HiOutlineKey } from "react-icons/hi2";

import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { changePasswordAction } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="h-10 px-8 w-full sm:w-auto">
      {pending ? "Şifre Değiştiriliyor..." : "Şifreyi Güncelle"}
    </Button>
  );
}

export function PasswordChangeForm() {
  const [state, action] = useActionState(changePasswordAction, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) {
      toast.success("Şifreniz başarıyla değiştirildi.");
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <div className="overflow-hidden rounded-2xl border bg-card">
      <div className="border-b px-6 py-4 flex items-center gap-2">
        <HiOutlineKey className="size-5 text-muted-foreground" />
        <h3 className="text-lg font-semibold">Şifre Değiştir</h3>
      </div>
      
      <div className="p-6">
        <form ref={formRef} action={action} className="space-y-6 max-w-sm">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Mevcut Şifre</Label>
              <PasswordInput
                id="currentPassword"
                name="currentPassword"
                required
                className="h-10"
                autoComplete="current-password"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="newPassword">Yeni Şifre</Label>
              <PasswordInput
                id="newPassword"
                name="newPassword"
                required
                className="h-10"
                autoComplete="new-password"
                minLength={8}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Yeni Şifre (Tekrar)</Label>
              <PasswordInput
                id="confirmPassword"
                name="confirmPassword"
                required
                className="h-10"
                autoComplete="new-password"
                minLength={8}
              />
            </div>
          </div>

          {state?.error && (
            <p className="text-sm font-medium text-destructive bg-destructive/10 p-3 rounded-md border border-destructive/20">
              {state.error}
            </p>
          )}

          <div className="pt-2">
            <SubmitButton />
          </div>
        </form>
      </div>
    </div>
  );
}
