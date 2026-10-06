"use client";

import { useActionState, useState, useTransition } from "react";
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
  HiOutlineDocumentText,
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

export function NewTicketForm({
  departments = [],
}: {
  departments?: { id: string; name: string; floor?: string | null }[];
}) {
  const [state, action] = useActionState(createTicket, undefined);
  const [cat, setCat] = useState("HARDWARE");
  const [pri, setPri] = useState("MEDIUM");

  const [files, setFiles] = useState<File[]>([]);
  const [isDragActive, setIsDragActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [isPending, startTransition] = useTransition();

  const deptList =
    departments.length > 0
      ? departments
      : [
          { id: "haber", name: "Haber Merkezi", floor: null },
          { id: "reji", name: "Reji & Yayın", floor: null },
          { id: "kurgu", name: "Kurgu & Montaj", floor: null },
          { id: "teknik", name: "Teknik Servis & IT", floor: null },
          { id: "muhasebe", name: "Muhasebe & Finans", floor: null },
          { id: "ik", name: "İnsan Kaynakları", floor: null },
          { id: "yonetim", name: "Yönetim", floor: null },
        ];

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFiles((prev) => [...prev, ...Array.from(e.dataTransfer.files!)]);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      setIsUploading(true);
      setUploadError("");
      try {
        if (files.length > 10) throw new Error("En fazla 10 dosya ekleyebilirsiniz.");
        const claims: Array<{ url: string; claimToken: string; fileName: string; mimeType: string; sizeBytes: number }> = [];
        for (const file of files) {
          if (file.size > 50 * 1024 * 1024) throw new Error(`${file.name}: 50 MB sınırı aşıldı.`);
          const fd = new FormData();
          fd.append("file", file);
          fd.append("subfolder", "tickets");
          const res = await fetch("/api/upload", { method: "POST", body: fd });
          const data = await res.json();
          if (!res.ok || !data.url || !data.claimToken) throw new Error(data.error || `${file.name} yüklenemedi.`);
          claims.push({ url: data.url, claimToken: data.claimToken, fileName: data.fileName, mimeType: data.mimeType, sizeBytes: data.sizeBytes });
        }
        if (claims.length > 0) formData.set("attachmentClaims", JSON.stringify(claims));

        // Form verisini sunucu aksiyonuna ilet
        action(formData);
      } catch (error) {
        setUploadError(error instanceof Error ? error.message : "Dosya yüklenemedi.");
      } finally {
        setIsUploading(false);
      }
    });
  };

  const isBusy = isPending || isUploading;

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
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

      {/* AÇIKLAMA & LOKASYON */}
      <div className="space-y-6">
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

        <div className="space-y-3 max-w-sm">
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
                  {d.name}{d.floor ? ` (${d.floor})` : ""}
                </option>
              ))}
              <option value="other">Diğer / Şube Dışı</option>
            </select>
          </div>
        </div>
      </div>

      {/* DOSYA YÜKLEME (Sürükle-Bırak) */}
      <div className="space-y-3">
        <Label className="text-base font-semibold">Ekran Görüntüsü / Dosya (Opsiyonel)</Label>

        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={cn(
            "relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 text-center transition-colors",
            isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/20 hover:bg-muted/30 hover:border-muted-foreground/40",
            files.length > 0 ? "pb-4" : ""
          )}
        >
          <input
            type="file"
            multiple
            className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
            onChange={(e) => {
              if (e.target.files?.length) {
                setFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
              }
            }}
          />
          <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-muted">
            <HiOutlinePaperClip className="size-6 text-muted-foreground" />
          </div>
          <h4 className="mb-1 text-sm font-semibold">Dosyaları buraya sürükleyin veya tıklayın</h4>
          <p className="text-xs text-muted-foreground">Birden fazla dosya ekleyebilirsiniz (Resim, PDF vs.)</p>

          {/* Yüklenen Dosyalar */}
          {files.length > 0 && (
            <div className="mt-6 flex w-full flex-wrap gap-2 relative z-20">
              {files.map((file, i) => (
                <div key={i} className="flex items-center gap-2 rounded-lg border bg-background px-3 py-2 text-xs shadow-sm">
                  <HiOutlineDocumentText className="size-4 text-primary" />
                  <span className="max-w-[150px] truncate font-medium">{file.name}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setFiles((prev) => prev.filter((_, index) => index !== i));
                    }}
                    className="ml-1 rounded-full p-1 hover:bg-destructive/10 text-destructive transition-colors"
                  >
                    <HiOutlineTrash className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {(state?.error || uploadError) && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm font-semibold text-destructive flex items-center gap-2">
          <HiOutlineExclamationTriangle className="size-5 shrink-0" />
          {state?.error || uploadError}
        </div>
      )}

      <div className="pt-2">
        <Button type="submit" className="h-12 w-full text-base font-semibold shadow-md" disabled={isBusy}>
          {isBusy ? "Talep İletiliyor…" : "Talebi Gönder"}
        </Button>
      </div>
    </form>
  );
}
