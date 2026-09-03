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
import { isITStaff } from "@/lib/rbac/permissions";
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
  const isStaff = isITStaff(user.role);

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
          <div className="relative group">
            <UserAvatar 
              role={user.role} 
              image={user.image} 
              className="size-24 border-4 border-card text-4xl shadow-sm transition-opacity group-hover:opacity-70" 
            />
            <label 
              htmlFor="pf-image-upload" 
              className="absolute inset-0 flex cursor-pointer items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity group-hover:opacity-100"
            >
              <span className="text-xs font-semibold text-white">Değiştir</span>
            </label>
            <input 
              type="file" 
              id="pf-image-upload" 
              accept="image/*" 
              className="hidden" 
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                if (file.size > 2 * 1024 * 1024) {
                  toast.error("Fotoğraf boyutu 2MB'den küçük olmalıdır.");
                  e.target.value = "";
                  return;
                }
                const reader = new FileReader();
                reader.onload = (ev) => {
                  const base64 = ev.target?.result as string;
                  const hiddenInput = document.getElementById("pf-hidden-image") as HTMLInputElement;
                  if (hiddenInput) {
                    hiddenInput.value = base64;
                    // Trigger a re-render to show preview (we can cheat by submitting or just state)
                    hiddenInput.dispatchEvent(new Event('change', { bubbles: true }));
                  }
                  
                  // Görseli anında önizleme için (DOM manipülasyonu)
                  const img = document.querySelector('.group img') as HTMLImageElement;
                  if (img) img.src = base64;
                };
                reader.readAsDataURL(file);
              }}
            />
          </div>
          <div className="mb-2">
            <h2 className="text-2xl font-bold tracking-tight">{user.name}</h2>
            <p className="font-medium text-primary">{roleLabel(user.role)}</p>
          </div>
        </div>

        <form action={action} className="mt-8 space-y-6">
          <input type="hidden" id="pf-hidden-image" name="imageBase64" />
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="pf-name" className="flex items-center gap-1.5">
                <HiOutlineUser className="size-4 text-muted-foreground" /> Ad Soyad <span className="text-red-500">*</span>
              </Label>
              <Input
                id="pf-name"
                name="name"
                defaultValue={user.name ?? ""}
                className={`h-10 ${!!user.name && !isStaff ? "bg-muted cursor-not-allowed opacity-70" : "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"}`}
                required
                readOnly={!!user.name && !isStaff}
              />
              {!!user.name && !isStaff && <p className="text-[10px] text-muted-foreground">İsim değiştirilemez. Değişiklik için IT ile görüşün.</p>}
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
                className={`h-10 ${!!user.email && !isStaff ? "bg-muted cursor-not-allowed opacity-70" : "focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"}`}
                required
                readOnly={!!user.email && !isStaff}
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
                disabled={!isStaff}
                className={`w-full rounded-lg border border-input bg-background text-foreground dark:bg-zinc-900 dark:text-zinc-100 px-3 h-10 text-sm outline-none transition-colors shadow-xs ${!isStaff ? 'bg-muted cursor-not-allowed opacity-70' : 'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50'}`}
              >
                <option value="" disabled className="bg-background text-muted-foreground dark:bg-zinc-900 dark:text-zinc-400">
                  Henüz atanmadı
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
              {!isStaff && <p className="text-[10px] text-muted-foreground">Departman bilgisini değiştirmek için IT ile görüşün.</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="pf-computer" className="flex items-center gap-1.5">
                <HiOutlineComputerDesktop className="size-4 text-muted-foreground" /> Bilgisayar Adı
              </Label>
              {(() => {
                const assignedComputer = computers.find((c: any) => c.userId === user.id);
                return (
                  <>
                    <select
                      id="pf-computer"
                      name="computerId"
                      defaultValue={assignedComputer?.id ?? ""}
                      disabled={!isStaff}
                      className={`w-full rounded-lg border border-input bg-background text-foreground dark:bg-zinc-900 dark:text-zinc-100 px-3 h-10 text-sm outline-none transition-colors shadow-xs ${!isStaff ? 'bg-muted cursor-not-allowed opacity-70' : 'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50'}`}
                    >
                      <option value="" className="bg-background text-foreground dark:bg-zinc-900 dark:text-zinc-100">
                        Henüz atanmadı
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
                    {!isStaff && <p className="text-[10px] text-muted-foreground">Bilgisayar atamaları IT tarafından yönetilir.</p>}
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
