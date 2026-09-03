"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import type { Role } from "@prisma/client";

import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ROLE_LABELS } from "@/lib/rbac/roles";

import { createUserAction } from "./actions";

const fieldClass =
  "w-full rounded-lg border border-input bg-background text-foreground dark:bg-zinc-900 dark:text-zinc-100 px-3 py-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="h-10">
      {pending ? "Ekleniyor…" : "Kullanıcı Ekle"}
    </Button>
  );
}

export function CreateUserForm({ roles, departments }: { roles: Role[]; departments?: any[] }) {
  const [state, action] = useActionState(createUserAction, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) {
      toast.success("Yeni kullanıcı sisteme başarıyla eklendi.");
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <form ref={formRef} action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="cu-name">Ad Soyad</Label>
          <Input id="cu-name" name="name" required placeholder="Ad Soyad" className="h-10" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cu-title">Ünvan (opsiyonel)</Label>
          <Input id="cu-title" name="title" placeholder="ör. Muhasebe Uzmanı" className="h-10" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cu-email">E-posta</Label>
          <Input id="cu-email" name="email" type="email" required placeholder="ad@halktv.com.tr" className="h-10" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cu-username">Kullanıcı adı</Label>
          <Input id="cu-username" name="username" required placeholder="ör. berk" className="h-10" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cu-password">Şifre</Label>
          <PasswordInput id="cu-password" name="password" required placeholder="En az 8 karakter" className="h-10" minLength={8} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cu-role">Rol</Label>
          <select id="cu-role" name="role" className={fieldClass}>
            {roles.map((r) => (
              <option key={r} value={r}>{ROLE_LABELS[r]}</option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="cu-departmentId">Departman</Label>
          <select id="cu-departmentId" name="departmentId" className={fieldClass} defaultValue="">
            <option value="" disabled>Seçiniz...</option>
            {departments?.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="cu-phone">Telefon (opsiyonel)</Label>
          <Input id="cu-phone" name="phone" placeholder="05XX XXX XX XX" className="h-10" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cu-employeeNo">Sicil No (opsiyonel)</Label>
          <Input id="cu-employeeNo" name="employeeNo" placeholder="Örn: 1045" className="h-10" />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="cu-notes">IT Notları (opsiyonel - sadece IT görür)</Label>
          <textarea id="cu-notes" name="notes" placeholder="Kullanıcı hakkında ek notlar..." className={`${fieldClass} resize-y min-h-[80px]`} />
        </div>
      </div>
      {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      <SubmitButton />
    </form>
  );
}
