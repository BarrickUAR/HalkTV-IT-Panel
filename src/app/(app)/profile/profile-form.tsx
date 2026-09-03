"use client";

import { useActionState, useEffect } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import { HiOutlineEnvelope, HiOutlinePhone, HiOutlineBuildingOffice2, HiOutlineComputerDesktop, HiOutlineUser } from "react-icons/hi2";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserAvatar } from "@/components/app-shell/user-avatar";
import { roleLabel } from "@/lib/rbac/roles";
import { updateProfileAction } from "./actions";
import type { Role } from "@prisma/client";

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="h-10 px-8">
      {pending ? "Kaydediliyor..." : "Değişiklikleri Kaydet"}
    </Button>
  );
}

export function ProfileForm({
  user,
  departments,
  computers,
}: {
  user: {
    id: string;
    name: string | null;
    email: string;
    role: Role;
    image: string | null;
    title: string | null;
    departmentId: string | null;
    phone: string | null;
  };
  departments: any[];
  computers: any[];
}) {
  const [state, action] = useActionState(updateProfileAction, undefined);

  useEffect(() => {
    if (state?.ok) {
      toast.success("Profil bilgileriniz başarıyla güncellendi.");
    }
  }, [state]);

  return (
    <div className="overflow-hidden rounded-2xl border bg-card">
      <div className="h-32 bg-muted" />
      
      <div className="px-6 pb-8">
        <div className="-mt-12 mb-6 flex items-end gap-4">
          <UserAvatar 
            role={user.role} 
            image={user.image} 
            className="size-24 border-4 border-card text-4xl shadow-sm" 
          />
          <div className="mb-2">
            <h2 className="text-2xl font-bold tracking-tight">{user.name}</h2>
            <p className="font-medium text-primary">{roleLabel(user.role)}</p>
          </div>
        </div>

        <form action={action} className="mt-8 space-y-6">
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="pf-name" className="flex items-center gap-1.5">
                <HiOutlineUser className="size-4 text-muted-foreground" /> Ad Soyad <span className="text-red-500">*</span>
              </Label>
              <Input
                id="pf-name"
                name="name"
                defaultValue={user.name ?? ""}
                className={`h-10 ${user.name ? "bg-muted cursor-not-allowed opacity-70" : ""}`}
                required
                readOnly={!!user.name}
              />
              {!!user.name && <p className="text-[10px] text-muted-foreground">İsim değiştirilemez. Değişiklik için IT ile görüşün.</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="pf-email" className="flex items-center gap-1.5">
                <HiOutlineEnvelope className="size-4 text-muted-foreground" /> E-Posta <span className="text-red-500">*</span>
              </Label>
              <Input
                id="pf-email"
                name="email"
                type="email"
                defaultValue={user.email}
                className={`h-10 ${user.email ? "bg-muted cursor-not-allowed opacity-70" : ""}`}
                required
                readOnly={!!user.email}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pf-departmentId" className="flex items-center gap-1.5">
                <HiOutlineBuildingOffice2 className="size-4 text-muted-foreground" /> Departman <span className="text-red-500">*</span>
              </Label>
              <select
                id="pf-departmentId"
                name="departmentId"
                defaultValue={user.departmentId ?? ""}
                className="w-full rounded-lg border border-input bg-background text-foreground dark:bg-zinc-900 dark:text-zinc-100 px-3 h-10 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 shadow-xs"
                required
              >
                <option value="" disabled className="bg-background text-muted-foreground dark:bg-zinc-900 dark:text-zinc-400">
                  Lütfen seçin...
                </option>
                {departments.map((d: any) => (
                  <option
                    key={d.id}
                    value={d.id}
                    className="bg-background text-foreground dark:bg-zinc-900 dark:text-zinc-100 py-1"
                  >
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pf-computer" className="flex items-center gap-1.5">
                <HiOutlineComputerDesktop className="size-4 text-muted-foreground" /> Bilgisayar Adı
              </Label>
              {(() => {
                const assignedComputer = computers.find((c: any) => c.userId === user.id);
                const hasComputer = !!assignedComputer;
                return (
                  <>
                    {hasComputer && <input type="hidden" name="computerId" value={assignedComputer.id} />}
                    <select
                      id="pf-computer"
                      name="computerId"
                      defaultValue={assignedComputer?.id ?? ""}
                      disabled={hasComputer}
                      className={`w-full rounded-lg border border-input bg-background text-foreground dark:bg-zinc-900 dark:text-zinc-100 px-3 h-10 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 shadow-xs ${
                        hasComputer ? "bg-muted cursor-not-allowed opacity-70" : ""
                      }`}
                    >
                      <option value="" className="bg-background text-foreground dark:bg-zinc-900 dark:text-zinc-100">
                        (Yok)
                      </option>
                      {computers.map((c: any) => (
                        <option
                          key={c.id}
                          value={c.id}
                          className="bg-background text-foreground dark:bg-zinc-900 dark:text-zinc-100 py-1"
                        >
                          {c.name}
                        </option>
                      ))}
                    </select>
                    {hasComputer && <p className="text-[10px] text-muted-foreground">Cihaz atanmış, değiştirilemez.</p>}
                  </>
                );
              })()}
            </div>

            <div className="space-y-2">
              <Label htmlFor="pf-phone" className="flex items-center gap-1.5">
                <HiOutlinePhone className="size-4 text-muted-foreground" /> Telefon (Opsiyonel)
              </Label>
              <Input
                id="pf-phone"
                name="phone"
                defaultValue={user.phone ?? ""}
                placeholder="ör. 05XX XXX XX XX"
                className="h-10"
              />
            </div>
          </div>

          {state?.error && (
            <p className="text-sm font-medium text-destructive bg-destructive/10 p-3 rounded-md border border-destructive/20">
              {state.error}
            </p>
          )}

          <div className="flex justify-end pt-4 border-t">
            <SaveButton />
          </div>
        </form>
      </div>

      <div className="bg-muted/50 p-4 px-6 text-sm text-muted-foreground border-t">
        Not: Profil bilgilerinizin doğru ve güncel olması, IT ekibinin size daha hızlı destek verebilmesi için önemlidir.
      </div>
    </div>
  );
}
