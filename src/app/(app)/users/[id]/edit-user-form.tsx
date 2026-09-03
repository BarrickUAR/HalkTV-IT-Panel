"use client";

import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import type { Role, UserStatus } from "@prisma/client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ROLE_LABELS } from "@/lib/rbac/roles";
import { cn } from "@/lib/utils";

import { resetPasswordAction, updateUserAction } from "../actions";

const fieldClass =
  "w-full rounded-lg border border-input bg-background text-foreground dark:bg-zinc-900 dark:text-zinc-100 px-3 py-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

function SaveButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="h-10">
      {pending ? "Kaydediliyor…" : label}
    </Button>
  );
}

export function EditUserForm({
  user,
  roles,
}: {
  user: {
    id: string;
    name: string | null;
    title: string | null;
    role: Role;
    status: UserStatus;
    departmentId: string | null;
    phone: string | null;
    employeeNo: string | null;
    notes: string | null;
  };
  roles: Role[];
}) {
  const [state, action] = useActionState(updateUserAction, undefined);
  useEffect(() => {
    if (state?.ok) toast.success("Kullanıcı güncellendi.");
  }, [state]);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="id" value={user.id} />
      <div className="space-y-2">
        <Label htmlFor="eu-name">Ad Soyad</Label>
        <Input
          id="eu-name"
          name="name"
          defaultValue={user.name ?? ""}
          className="h-10"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="eu-title">Ünvan</Label>
        <Input
          id="eu-title"
          name="title"
          defaultValue={user.title ?? ""}
          placeholder="ör. Muhasebe Uzmanı"
          className="h-10"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="eu-role">Rol</Label>
          <select
            id="eu-role"
            name="role"
            defaultValue={user.role}
            className={fieldClass}
          >
            {roles.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r]}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="eu-status">Durum</Label>
          <select
            id="eu-status"
            name="status"
            defaultValue={user.status}
            className={fieldClass}
          >
            <option value="ACTIVE">Aktif</option>
            <option value="INACTIVE">Pasif (girişi kapat)</option>
          </select>
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="eu-department">Departman</Label>
          <select
            id="eu-department"
            name="department"
            className={fieldClass}
            defaultValue={user.departmentId ?? ""}
          >
            <option value="">Belirtilmedi</option>
            <option value="Haber Merkezi">Haber Merkezi</option>
            <option value="Editör Katı">Editör Katı</option>
            <option value="Reji">Reji</option>
            <option value="Teknik">Teknik</option>
            <option value="Prodüksiyon">Prodüksiyon</option>
            <option value="İnsan Kaynakları">İnsan Kaynakları</option>
            <option value="Muhasebe">Muhasebe</option>
            <option value="Yönetim">Yönetim</option>
          </select>
        </div>
        
        {/* Detaylı Profil Bilgileri */}
        <div className="space-y-2">
          <Label htmlFor="eu-phone">Telefon</Label>
          <Input
            id="eu-phone"
            name="phone"
            defaultValue={user.phone ?? ""}
            placeholder="ör. 05XX XXX XX XX"
            className="h-10"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="eu-employeeNo">Sicil No</Label>
          <Input
            id="eu-employeeNo"
            name="employeeNo"
            defaultValue={user.employeeNo ?? ""}
            placeholder="ör. HLK-1045"
            className="h-10"
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="eu-notes">IT Notları (Sadece Yöneticiler Görür)</Label>
          <textarea
            id="eu-notes"
            name="notes"
            defaultValue={user.notes ?? ""}
            placeholder="Personel hakkında IT tarafında bilinmesi gereken notlar (Örn: Remote çalışıyor, cihazı şahsi vb.)"
            className={cn(fieldClass, "min-h-[80px] resize-y")}
          />
        </div>
      </div>
      {state?.error ? (
        <p className="text-sm text-destructive">{state.error}</p>
      ) : null}
      <SaveButton label="Kaydet" />
    </form>
  );
}

export function ResetPasswordForm({ userId }: { userId: string }) {
  const [state, action] = useActionState(resetPasswordAction, undefined);
  useEffect(() => {
    if (state?.ok) toast.success("Şifre sıfırlandı.");
  }, [state]);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="id" value={userId} />
      <div className="space-y-2">
        <Label htmlFor="rp-password">Yeni şifre</Label>
        <Input
          id="rp-password"
          name="password"
          type="text"
          placeholder="En az 8 karakter"
          className="h-10"
        />
      </div>
      {state?.error ? (
        <p className="text-sm text-destructive">{state.error}</p>
      ) : null}
      <SaveButton label="Şifreyi Sıfırla" />
    </form>
  );
}
