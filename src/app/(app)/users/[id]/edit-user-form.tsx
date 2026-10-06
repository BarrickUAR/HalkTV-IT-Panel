"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import type { Role, UserStatus } from "@prisma/client";
import {
  HiOutlineComputerDesktop,
  HiOutlineKey,
  HiOutlineTrash,
  HiOutlinePlus,
  HiOutlineCamera,
  HiOutlineBuildingOffice2,
  HiOutlineUser,
  HiOutlineEnvelope,
  HiOutlinePhone,
  HiOutlineIdentification,
  HiOutlineBriefcase,
  HiOutlineShieldCheck,
  HiOutlineChatBubbleLeftRight,
} from "react-icons/hi2";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ROLE_LABELS } from "@/lib/rbac/roles";
import { cn } from "@/lib/utils";
import { UserAvatar } from "@/components/app-shell/user-avatar";

import { resetPasswordAction, updateUserAction, assignComputerAction, unlinkComputerAction } from "../actions";

const fieldClass =
  "w-full rounded-lg border border-input bg-background text-foreground dark:bg-zinc-900 dark:text-zinc-100 px-3 py-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

function SaveButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="h-10 bg-[#c8102e] hover:bg-[#a60d26] text-white px-6 font-medium shadow">
      {pending ? "Kaydediliyor…" : label}
    </Button>
  );
}

export function EditUserForm({
  user,
  roles,
  departments,
  computers = [],
  currentUserId,
  currentUserRole,
}: {
  user: {
    id: string;
    name: string | null;
    username: string | null;
    email: string;
    image: string | null;
    title: string | null;
    role: Role;
    status: UserStatus;
    departmentId: string | null;
    phone: string | null;
    employeeNo: string | null;
    notes: string | null;
    directMessagesEnabled: boolean;
    showInLiveChat: boolean;
    computers?: Array<{ id: string; name: string }>;
  };
  roles: Role[];
  departments: { id: string; name: string; floor?: string | null }[];
  computers?: Array<{ id: string; name: string; userId: string | null; user?: { name: string | null } | null }>;
  currentUserId: string;
  currentUserRole: Role;
}) {
  const [state, action, pending] = useActionState(updateUserAction, undefined);
  const [selectedRole, setSelectedRole] = useState<Role>(user.role);
  const [selectedStatus, setSelectedStatus] = useState<UserStatus>(user.status);
  const [savedRole, setSavedRole] = useState<Role>(user.role);
  const [previewImage, setPreviewImage] = useState<string | null>(user.image);
  const [base64Image, setBase64Image] = useState<string>("");

  useEffect(() => {
    setSelectedRole(user.role);
    setSavedRole(user.role);
    setSelectedStatus(user.status);
  }, [user.id, user.role, user.status]);

  useEffect(() => {
    if (state?.ok) {
      if (state.savedRole) {
        setSelectedRole(state.savedRole);
        setSavedRole(state.savedRole);
      }
      if (state.savedStatus) setSelectedStatus(state.savedStatus);
      toast.success("Kullanıcı bilgileri ve yetkileri başarıyla güncellendi.");
    }
    if (state?.error) {
      toast.error(state.error);
    }
  }, [state]);

  const itRoles = ["IT_AGENT", "TEKNIK_YONETMEN", "TEKNIK_MUDUR", "SUPER_ADMIN"];
  const isIT = itRoles.includes(selectedRole);
  const isSelf = user.id === currentUserId;
  const isSuperAdmin = currentUserRole === "SUPER_ADMIN";

  // Kullanıcının mevcut rolü her zaman seçeneklerde bulunmalı
  const availableRoles = Array.from(new Set([user.role, ...roles]));

  const assignedComputer = user.computers?.[0] ?? computers.find((c) => c.userId === user.id);

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="id" value={user.id} />
      <input type="hidden" name="expectedRole" value={savedRole} />
      <input type="hidden" name="imageBase64" value={base64Image} />

      {/* Profil Fotoğrafı Yükleme / Önizleme Alanı */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 p-4 rounded-xl bg-muted/30 border">
        <div className="relative group cursor-pointer">
          <UserAvatar
            name={user.name}
            image={previewImage}
            className="size-20 text-2xl border-2 border-border shadow-sm group-hover:opacity-80 transition-opacity"
          />
          <label
            htmlFor="user-image-file-input"
            className="absolute inset-0 flex flex-col items-center justify-center rounded-full bg-black/55 text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-[10px] font-semibold"
          >
            <HiOutlineCamera className="size-5 mb-0.5" />
            Yükle
          </label>
          <input
            id="user-image-file-input"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              if (file.size > 3 * 1024 * 1024) {
                toast.error("Fotoğraf boyutu en fazla 3MB olabilir.");
                e.target.value = "";
                return;
              }
              const reader = new FileReader();
              reader.onload = (ev) => {
                const base64 = ev.target?.result as string;
                setPreviewImage(base64);
                setBase64Image(base64);
              };
              reader.readAsDataURL(file);
            }}
          />
        </div>

        <div className="flex-1 min-w-0 space-y-1.5">
          <p className="text-sm font-semibold text-foreground">Profil Fotoğrafı</p>
          <p className="text-xs text-muted-foreground">
            Fotoğrafı değiştirmek için üzerine tıklayıp bilgisayarınızdan görsel seçebilir veya doğrudan bağlantı girebilirsiniz.
          </p>
          <div className="flex items-center gap-2 pt-1 max-w-lg">
            <Input
              id="eu-image"
              name="image"
              defaultValue={user.image ?? ""}
              placeholder="https://... (Fotoğraf linki)"
              onChange={(e) => {
                if (e.target.value.trim()) {
                  setPreviewImage(e.target.value.trim());
                  setBase64Image("");
                }
              }}
              className="h-8 text-xs font-mono"
            />
            {previewImage && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 text-xs text-muted-foreground hover:text-destructive"
                onClick={() => {
                  setPreviewImage(null);
                  setBase64Image("");
                  const inp = document.getElementById("eu-image") as HTMLInputElement;
                  if (inp) inp.value = "";
                }}
              >
                Kaldır
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        {/* Ad Soyad */}
        <div className="space-y-2">
          <Label htmlFor="eu-name" className="flex items-center gap-1.5">
            <HiOutlineUser className="size-4 text-muted-foreground" /> Ad Soyad <span className="text-red-500">*</span>
          </Label>
          <Input
            id="eu-name"
            name="name"
            required
            defaultValue={user.name ?? ""}
            className="h-10"
          />
        </div>

        {/* Kullanıcı Adı */}
        <div className="space-y-2">
          <Label htmlFor="eu-username" className="flex items-center gap-1.5">
            <HiOutlineIdentification className="size-4 text-muted-foreground" /> Kullanıcı Adı (Sistem / Kiosk)
          </Label>
          <Input
            id="eu-username"
            name="username"
            defaultValue={user.username ?? ""}
            placeholder="ör. berkucar"
            className="h-10 font-mono"
          />
        </div>

        {/* E-posta Adresi */}
        <div className="space-y-2">
          <Label htmlFor="eu-email" className="flex items-center gap-1.5">
            <HiOutlineEnvelope className="size-4 text-muted-foreground" /> E-posta Adresi <span className="text-red-500">*</span>
          </Label>
          <Input
            id="eu-email"
            name="email"
            type="email"
            defaultValue={user.email}
            placeholder="ad@halktv.com.tr"
            className="h-10"
          />
        </div>

        {/* Ünvan / Görev */}
        <div className="space-y-2">
          <Label htmlFor="eu-title" className="flex items-center gap-1.5">
            <HiOutlineBriefcase className="size-4 text-muted-foreground" /> Ünvan / Görev
          </Label>
          <Input
            id="eu-title"
            name="title"
            defaultValue={user.title ?? ""}
            placeholder="ör. Teknik Yönetmen, Haber Müdürü, Spiker..."
            className="h-10"
          />
        </div>

        {/* Sistem Rolü */}
        <div className="space-y-2">
          <Label htmlFor="eu-role" className="flex items-center gap-1.5">
            <HiOutlineShieldCheck className="size-4 text-[#c8102e]" /> Sistem Rolü (Yetki Seviyesi) <span className="text-red-500">*</span>
          </Label>
          <select
            id="eu-role"
            name="role"
            value={selectedRole}
            onChange={(event) => setSelectedRole(event.target.value as Role)}
            disabled={pending}
            className={cn(fieldClass, "font-semibold")}
          >
            {availableRoles.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABELS[r] ?? r}
              </option>
            ))}
          </select>
          {isSelf && !isSuperAdmin && (
            <p className="text-[11px] text-amber-600 dark:text-amber-400">
              * Kendi yönetici rolünüzü yalnızca bir Sistem Yöneticisi değiştirebilir.
            </p>
          )}
        </div>

        {/* Hesap Durumu */}
        <div className="space-y-2">
          <Label htmlFor="eu-status">Hesap Durumu</Label>
          <select
            id="eu-status"
            name="status"
            value={selectedStatus}
            disabled={pending}
            onChange={(event) => setSelectedStatus(event.target.value as UserStatus)}
            className={fieldClass}
          >
            <option value="ACTIVE">Aktif (Giriş yapabilir, talepleri açık)</option>
            <option value="INACTIVE">Pasif (Giriş engellensin)</option>
          </select>
        </div>

        {/* Departman & Kat */}
        <div className="space-y-2">
          <Label htmlFor="eu-department" className="flex items-center gap-1.5">
            <HiOutlineBuildingOffice2 className="size-4 text-muted-foreground" /> Departman & Kat
          </Label>
          <select
            id="eu-department"
            name="department"
            className={fieldClass}
            defaultValue={user.departmentId ?? ""}
          >
            <option value="">Belirtilmedi</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}{d.floor ? ` (${d.floor})` : ""}
              </option>
            ))}
          </select>
        </div>

        {/* Birincil Bilgisayar / Cihaz Seçimi */}
        <div className="space-y-2">
          <Label htmlFor="eu-computer" className="flex items-center gap-1.5">
            <HiOutlineComputerDesktop className="size-4 text-muted-foreground" /> Birincil Bilgisayar / Cihaz
          </Label>
          <select
            id="eu-computer"
            name="computerId"
            defaultValue={assignedComputer?.id ?? ""}
            className={fieldClass}
          >
            <option value="">Atanmamış (Bağlı Cihaz Yok)</option>
            {computers.map((c) => (
              <option key={c.id} value={c.id}>
                🖥️ {c.name} {c.userId && c.userId !== user.id ? `(Şu an: ${c.user?.name || "Başkası"})` : ""}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-muted-foreground">
            Kullanıcının kioskta otomatik oturum açacağı birincil bilgisayarı.
          </p>
        </div>

        {/* Telefon / Dahili */}
        <div className="space-y-2">
          <Label htmlFor="eu-phone" className="flex items-center gap-1.5">
            <HiOutlinePhone className="size-4 text-muted-foreground" /> Dahili / Cep Telefonu
          </Label>
          <Input
            id="eu-phone"
            name="phone"
            defaultValue={user.phone ?? ""}
            placeholder="ör. 05XX XXX XX XX veya Dahili: 104"
            className="h-10"
          />
        </div>

        {/* Sicil No */}
        <div className="space-y-2">
          <Label htmlFor="eu-employeeNo" className="flex items-center gap-1.5">
            <HiOutlineIdentification className="size-4 text-muted-foreground" /> Sicil No / Personel Kodu
          </Label>
          <Input
            id="eu-employeeNo"
            name="employeeNo"
            defaultValue={user.employeeNo ?? ""}
            placeholder="ör. HLK-1045"
            className="h-10 font-mono"
          />
        </div>

        {/* IT Notları */}
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="eu-notes">IT Yönetici Notları (Sadece IT ve Yöneticiler Görür)</Label>
          <textarea
            id="eu-notes"
            name="notes"
            defaultValue={user.notes ?? ""}
            placeholder="Personel hakkında IT tarafında bilinmesi gereken cihaz, donanım veya çalışma alanı notları..."
            className={cn(fieldClass, "min-h-[85px] resize-y leading-relaxed")}
          />
        </div>

        {/* İletişim Tercihleri (Personelin Profil Ayarları) */}
        <div className="space-y-3 sm:col-span-2 pt-4 border-t">
          <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
            <HiOutlineChatBubbleLeftRight className="size-3.5" /> Personel İletişim & Sohbet İzinleri
          </h4>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="eu-dms"
              name="directMessagesEnabled"
              className="size-4 rounded border-gray-300 text-[#c8102e] focus:ring-[#c8102e]"
              defaultChecked={user.directMessagesEnabled}
            />
            <Label htmlFor="eu-dms" className="cursor-pointer font-medium mb-0 text-sm">
              Personel içi doğrudan mesajlaşma (DM) açık olsun
            </Label>
          </div>
          {isIT && (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="eu-showchat"
                name="showInLiveChat"
                className="size-4 rounded border-gray-300 text-[#c8102e] focus:ring-[#c8102e]"
                defaultChecked={user.showInLiveChat}
              />
              <Label htmlFor="eu-showchat" className="cursor-pointer font-medium mb-0 text-sm text-[#c8102e] dark:text-red-400">
                Kiosk Canlı Destek (IT) listesinde çevrimiçi destek uzmanı olarak görünsün
              </Label>
            </div>
          )}
        </div>
      </div>

      {state?.error && (
        <div role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive border border-destructive/20 font-medium">
          {state.error}
        </div>
      )}
      {state?.ok && selectedRole === savedRole && (
        <p role="status" className="text-sm text-emerald-700 dark:text-emerald-400">
          Kaydedildi. Güncel yetki: {ROLE_LABELS[savedRole]}.
        </p>
      )}
      {selectedRole !== savedRole && (
        <p role="status" className="text-sm text-amber-700 dark:text-amber-400">
          Rol değişikliği henüz kaydedilmedi. Uygulamak için aşağıdaki kaydet düğmesine basın.
        </p>
      )}

      <div className="pt-3 flex justify-end border-t">
        <SaveButton label="Tüm Bilgileri ve Yetkiyi Kaydet" />
      </div>
    </form>
  );
}

export function AssignComputerSection({
  userId,
  userComputers,
  allComputers,
}: {
  userId: string;
  userComputers: Array<{ id: string; name: string; notes: string | null; updatedAt: Date }>;
  allComputers: Array<{ id: string; name: string; userId: string | null; user?: { name: string | null } | null }>;
}) {
  const [assignState, assignAction] = useActionState(assignComputerAction, undefined);
  const [unlinkState, unlinkAction] = useActionState(unlinkComputerAction, undefined);
  const [selectedCompId, setSelectedCompId] = useState("");
  const [manualCompName, setManualCompName] = useState("");

  useEffect(() => {
    if (assignState?.ok) {
      toast.success("Bilgisayar başarıyla bu kullanıcıya atandı.");
      setSelectedCompId("");
      setManualCompName("");
    }
    if (assignState?.error) toast.error(assignState.error);
  }, [assignState]);

  useEffect(() => {
    if (unlinkState?.ok) toast.success("Bilgisayar bağlantısı kaldırıldı.");
    if (unlinkState?.error) toast.error(unlinkState.error);
  }, [unlinkState]);

  const availableComputers = allComputers.filter((c) => c.userId !== userId);

  return (
    <div className="space-y-5">
      {/* Mevcut Atanmış Bilgisayarlar */}
      <div>
        <h3 className="text-sm font-semibold mb-2.5 text-foreground flex items-center gap-1.5">
          <HiOutlineComputerDesktop className="size-4 text-[#c8102e]" />
          Kullanıcıya Atanmış Bilgisayarlar ({userComputers.length})
        </h3>
        {userComputers.length === 0 ? (
          <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground bg-muted/20">
            Bu kullanıcıya henüz atanmış bir bilgisayar bulunmuyor.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {userComputers.map((comp) => {
              const ipMatch = comp.notes?.match(/IP:\s*([^\s|]+)/)?.[1];
              const winUserMatch = comp.notes?.match(/Windows:\s*([^\s|]+)/)?.[1];

              // Temiz not: IP ve Windows bilgilerini çıkartıp sadece gerçek notları bırakalım
              let cleanNotes = comp.notes || "";
              if (ipMatch) cleanNotes = cleanNotes.replace(/IP:\s*([^\s|]+)/g, "").trim();
              if (winUserMatch) cleanNotes = cleanNotes.replace(/Windows:\s*([^\s|]+)/g, "").trim();
              cleanNotes = cleanNotes.replace(/\|/g, "").trim();

              return (
                <div
                  key={comp.id}
                  className="rounded-lg border bg-card p-3.5 shadow-sm flex items-start justify-between gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono font-bold text-sm text-foreground">🖥️ {comp.name}</span>
                      <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400 px-2 py-0.5 rounded border border-emerald-200">
                        Aktif Bağlı
                      </span>
                    </div>

                    {(ipMatch || winUserMatch) && (
                      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs bg-muted/30 p-2 rounded-md border">
                        {ipMatch && (
                          <p className="text-muted-foreground font-mono flex items-center gap-1.5">
                            <span className="font-semibold text-foreground">IP:</span> {ipMatch}
                          </p>
                        )}
                        {winUserMatch && (
                          <p className="text-muted-foreground font-mono flex items-center gap-1.5">
                            <span className="font-semibold text-foreground">Kullanıcı:</span> {winUserMatch}
                          </p>
                        )}
                      </div>
                    )}

                    {cleanNotes && (
                      <p className="text-xs text-muted-foreground mt-2 whitespace-pre-line leading-relaxed border-t pt-2">
                        {cleanNotes}
                      </p>
                    )}

                    <p className="text-[10px] text-muted-foreground mt-2">
                      Son Aktivite: {new Date(comp.updatedAt).toLocaleString("tr-TR")}
                    </p>
                  </div>

                  <form action={unlinkAction}>
                    <input type="hidden" name="computerId" value={comp.id} />
                    <input type="hidden" name="userId" value={userId} />
                    <Button
                      type="submit"
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:bg-destructive/10 h-8 px-2"
                      title="Bağlantıyı Kaldır"
                    >
                      <HiOutlineTrash className="size-4 mr-1" /> Kaldır
                    </Button>
                  </form>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Yeni / Mevcut Bilgisayar Ata Formu */}
      <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Yeni Cihaz Bağla veya Bilgisayar Eşleştir
        </h4>
        <form action={assignAction} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
          <input type="hidden" name="userId" value={userId} />

          <div className="sm:col-span-5 space-y-1.5">
            <Label htmlFor="ac-select" className="text-xs">Sistemdeki Mevcut Cihazlardan Seç</Label>
            <select
              id="ac-select"
              name="computerId"
              value={selectedCompId}
              onChange={(e) => {
                setSelectedCompId(e.target.value);
                if (e.target.value) setManualCompName("");
              }}
              className={cn(fieldClass, "h-9 text-xs")}
            >
              <option value="">-- Cihaz Seçiniz --</option>
              {availableComputers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.user?.name ? `(Şu an: ${c.user.name})` : "(Boşta)"}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-4 space-y-1.5">
            <Label htmlFor="ac-manual" className="text-xs">Veya Cihaz Adı Yaz (Yeni / Ağ Adı)</Label>
            <Input
              id="ac-manual"
              name="computerName"
              placeholder="ör. Teknik-yonetmen"
              value={manualCompName}
              onChange={(e) => {
                setManualCompName(e.target.value);
                if (e.target.value) setSelectedCompId("");
              }}
              className="h-9 font-mono text-xs"
            />
          </div>

          <div className="sm:col-span-3">
            <Button
              type="submit"
              disabled={!selectedCompId && !manualCompName.trim()}
              className="w-full h-9 text-xs font-semibold"
            >
              <HiOutlinePlus className="size-3.5 mr-1" /> Cihazı Ata
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function ResetPasswordForm({ userId }: { userId: string }) {
  const [state, action] = useActionState(resetPasswordAction, undefined);
  const [pwd, setPwd] = useState("");

  useEffect(() => {
    if (state?.ok) {
      toast.success("Kullanıcı şifresi başarıyla güncellendi.");
      setPwd("");
    }
    if (state?.error) toast.error(state.error);
  }, [state]);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="id" value={userId} />
      <div className="space-y-2">
        <Label htmlFor="rp-password">Yeni Şifre Belirle</Label>
        <div className="flex gap-2">
          <Input
            id="rp-password"
            name="password"
            type="text"
            required
            value={pwd}
            onChange={(e) => setPwd(e.target.value)}
            placeholder="En az 8 karakter şifre girin"
            className="h-10 font-mono"
            minLength={8}
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => setPwd(Array.from(crypto.getRandomValues(new Uint8Array(12)), byte => byte.toString(16).padStart(2, "0")).join(""))}
            className="h-10 shrink-0 text-xs font-semibold"
            title="Varsayılan Halk TV şifresini yaz"
          >
            Rastgele parola oluştur
          </Button>
        </div>
      </div>
      {state?.error && (
        <p className="text-sm text-destructive font-medium">{state.error}</p>
      )}
      <Button type="submit" variant="destructive" className="h-10">
        <HiOutlineKey className="size-4 mr-1.5" /> Şifreyi Kaydet / Sıfırla
      </Button>
    </form>
  );
}
