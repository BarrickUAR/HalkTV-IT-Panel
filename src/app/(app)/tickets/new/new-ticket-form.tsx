"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  HiOutlineComputerDesktop,
  HiOutlineCommandLine,
  HiOutlineKey,
  HiOutlineWifi,
  HiOutlineEnvelope,
  HiOutlineEllipsisHorizontalCircle,
  HiOutlineArrowDown,
  HiOutlineMinus,
  HiOutlineArrowUp,
  HiOutlineExclamationTriangle,
  HiOutlinePaperClip,
  HiOutlineMapPin,
  HiOutlineTrash,
} from "react-icons/hi2";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CATEGORY_LABELS, PRIORITY_LABELS } from "@/lib/ticket-labels";
import { createTicket } from "../actions";
import { cn } from "@/lib/utils";

const CATEGORIES = [
  { id: "HARDWARE", icon: HiOutlineComputerDesktop },
  { id: "SOFTWARE", icon: HiOutlineCommandLine },
  { id: "ACCOUNT_ACCESS", icon: HiOutlineKey },
  { id: "NETWORK", icon: HiOutlineWifi },
  { id: "EMAIL", icon: HiOutlineEnvelope },
  { id: "OTHER", icon: HiOutlineEllipsisHorizontalCircle },
] as const;

const PRIORITIES = [
  { id: "LOW", icon: HiOutlineArrowDown, color: "text-emerald-500", bg: "bg-emerald-500/10", border: "border-emerald-200 dark:border-emerald-900" },
  { id: "MEDIUM", icon: HiOutlineMinus, color: "text-blue-500", bg: "bg-blue-500/10", border: "border-blue-200 dark:border-blue-900" },
  { id: "HIGH", icon: HiOutlineArrowUp, color: "text-orange-500", bg: "bg-orange-500/10", border: "border-orange-200 dark:border-orange-900" },
  { id: "URGENT", icon: HiOutlineExclamationTriangle, color: "text-red-500", bg: "bg-red-500/10", border: "border-red-200 dark:border-red-900" },
] as const;

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="h-12 w-full text-base font-semibold shadow-md" disabled={pending}>
      {pending ? "Talep İletiliyor…" : "Talebi Gönder"}
    </Button>
  );
}

export function NewTicketForm({
  departments = [],
}: {
  departments?: { id: string; name: string }[];
}) {
  const [state, action] = useActionState(createTicket, undefined);
  const [cat, setCat] = useState("HARDWARE");
  const [pri, setPri] = useState("MEDIUM");
  const [file, setFile] = useState<File | null>(null);

  const deptList =
    departments.length > 0
      ? departments
      : [
          { id: "haber", name: "Haber Merkezi" },
          { id: "reji", name: "Reji & Yayın" },
          { id: "kurgu", name: "Kurgu & Montaj" },
          { id: "teknik", name: "Teknik Servis & IT" },
          { id: "muhasebe", name: "Muhasebe & Finans" },
          { id: "ik", name: "İnsan Kaynakları" },
          { id: "yonetim", name: "Yönetim" },
        ];

  return (
    <form action={action} className="space-y-8">
      {/* BAŞLIK */}
      <div className="space-y-3">
        <Label htmlFor="title" className="text-base font-semibold">
          Sorun Nedir?
        </Label>
        <Input
          id="title"
          name="title"
          required
          placeholder="Örn: Bilgisayarım açılmıyor, e-postalarıma giremiyorum..."
          className="h-12 text-base px-4 bg-muted/30 focus-visible:bg-transparent transition-colors"
        />
      </div>

      {/* KATEGORİ & ÖNCELİK */}
      <div className="grid gap-8 md:grid-cols-2">
        <div className="space-y-3">
          <Label className="text-base font-semibold">Kategori</Label>
          <div className="grid grid-cols-2 gap-2">
            {CATEGORIES.map((c) => (
              <label
                key={c.id}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-all",
                  cat === c.id
                    ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20"
                    : "border-border bg-card hover:bg-muted/50"
                )}
              >
                <input
                  type="radio"
                  name="category"
                  value={c.id}
                  checked={cat === c.id}
                  onChange={(e) => setCat(e.target.value)}
                  className="sr-only"
                />
                <div className={cn("rounded-md p-1.5", cat === c.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
                  <c.icon className="size-4" />
                </div>
                <span className={cn("text-sm font-medium", cat === c.id ? "text-foreground" : "text-muted-foreground")}>
                  {CATEGORY_LABELS[c.id as keyof typeof CATEGORY_LABELS]}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <Label className="text-base font-semibold">Öncelik Durumu</Label>
          <div className="flex flex-col gap-2">
            {PRIORITIES.map((p) => (
              <label
                key={p.id}
                className={cn(
                  "flex cursor-pointer items-center justify-between rounded-xl border p-3.5 transition-all",
                  pri === p.id
                    ? cn("border-primary shadow-sm ring-1 ring-primary/20", p.bg)
                    : "border-border bg-card hover:bg-muted/50"
                )}
              >
                <input
                  type="radio"
                  name="priority"
                  value={p.id}
                  checked={pri === p.id}
                  onChange={(e) => setPri(e.target.value)}
                  className="sr-only"
                />
                <div className="flex items-center gap-3">
                  <div className={cn("rounded-md p-1", pri === p.id ? p.bg : "bg-transparent", p.color)}>
                    <p.icon className="size-5" />
                  </div>
                  <span className={cn("text-sm font-semibold", pri === p.id ? "text-foreground" : "text-muted-foreground")}>
                    {PRIORITY_LABELS[p.id as keyof typeof PRIORITY_LABELS]}
                  </span>
                </div>
                <div className={cn("size-4 rounded-full border-2", pri === p.id ? "border-primary bg-primary" : "border-muted-foreground/30")}>
                  {pri === p.id && <div className="m-auto size-1.5 rounded-full bg-background mt-[3px]" />}
                </div>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* AÇIKLAMA */}
      <div className="space-y-3">
        <Label htmlFor="description" className="text-base font-semibold">
          Detaylı Açıklama
        </Label>
        <textarea
          id="description"
          name="description"
          required
          rows={4}
          placeholder="Lütfen yaşadığınız sorunu detaylıca anlatın. Ekranda bir hata mesajı görüyorsanız mutlaka belirtin."
          className="w-full rounded-xl border border-input bg-muted/30 p-4 text-sm outline-none transition-colors focus-visible:bg-transparent focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 resize-none"
        />
      </div>

      {/* LOKASYON & DOSYA */}
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-3">
          <Label htmlFor="location" className="text-base font-semibold">Bulunduğunuz Yer</Label>
          <div className="relative">
            <HiOutlineMapPin className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-muted-foreground" />
            <select
              id="location"
              name="location"
              required
              className="w-full h-11 appearance-none rounded-xl border border-input bg-muted/30 pl-10 pr-4 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              <option value="">Lütfen departman seçin...</option>
              {deptList.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
              <option value="other">Diğer / Şube Dışı</option>
            </select>
          </div>
        </div>

        <div className="space-y-3">
          <Label htmlFor="attachment" className="text-base font-semibold">Ekran Görüntüsü / Dosya (Opsiyonel)</Label>
          <div className="relative">
            <input
              id="attachment"
              name="attachment"
              type="file"
              className="sr-only"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
            />
            <label
              htmlFor="attachment"
              className={cn(
                "flex h-11 cursor-pointer items-center justify-between rounded-xl border border-dashed px-4 text-sm transition-colors",
                file ? "border-primary bg-primary/5" : "border-border hover:bg-muted/30"
              )}
            >
              <div className="flex items-center gap-2 overflow-hidden">
                <HiOutlinePaperClip className={cn("size-4 shrink-0", file ? "text-primary" : "text-muted-foreground")} />
                <span className={cn("truncate font-medium", file ? "text-primary" : "text-muted-foreground")}>
                  {file ? file.name : "Dosya yüklemek için tıklayın..."}
                </span>
              </div>
              {file && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    setFile(null);
                    const el = document.getElementById("attachment") as HTMLInputElement;
                    if (el) el.value = "";
                  }}
                  className="rounded-full p-1 hover:bg-black/10 text-destructive"
                >
                  <HiOutlineTrash className="size-4" />
                </button>
              )}
            </label>
          </div>
        </div>
      </div>

      {state?.error && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm font-semibold text-destructive flex items-center gap-2">
          <HiOutlineExclamationTriangle className="size-5 shrink-0" />
          {state.error}
        </div>
      )}

      <div className="pt-2">
        <SubmitButton />
      </div>
    </form>
  );
}
