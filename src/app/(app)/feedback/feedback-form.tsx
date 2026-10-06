"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { HiOutlineLightBulb, HiOutlineMegaphone, HiOutlineCheckCircle, HiOutlinePaperClip, HiOutlineXMark } from "react-icons/hi2";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { submitFeedbackAction } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full h-11 text-base" disabled={pending}>
      {pending ? "Gönderiliyor..." : "Anonim Olarak Gönder"}
    </Button>
  );
}

const CATEGORIES = [
  "Donanım (PC, Monitör vb.)",
  "Yazılım (Uygulamalar)",
  "Ağ & İnternet",
  "Ofis Ortamı",
  "İnsan Kaynakları",
  "Genel",
];

export function FeedbackForm() {
  const [state, action] = useActionState(submitFeedbackAction, undefined);
  const [type, setType] = useState<"COMPLAINT" | "SUGGESTION">("SUGGESTION");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [attachmentUrl, setAttachmentUrl] = useState<string>("");

  if (state?.ok) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <div className="flex size-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 mb-4">
          <HiOutlineCheckCircle className="size-8" />
        </div>
        <h3 className="text-xl font-semibold mb-2">Mesajınız İletildi!</h3>
        <p className="text-muted-foreground text-sm max-w-[320px] mx-auto leading-relaxed mb-6">
          Düşüncelerinizi paylaştığınız için teşekkür ederiz. Şikayetinizin/önerinizin sonucunu aşağıdaki **Takip Kodu** ile sorgulayabilirsiniz. Lütfen bu kodu not alın.
        </p>

        <div className="bg-muted p-4 rounded-xl border flex flex-col items-center gap-2 mb-8 w-full max-w-[300px]">
          <span className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Takip Kodunuz</span>
          <span className="text-2xl font-mono font-bold tracking-widest text-foreground select-all">{state.pinCode}</span>
        </div>

        <Button
          variant="outline"
          onClick={() => window.location.reload()}
        >
          Yeni Bir Mesaj Gönder
        </Button>
      </div>
    );
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", f);
      const res = await fetch("/api/upload?subfolder=feedback", {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        setAttachmentUrl(data.url);
      } else {
        setFile(null);
        alert("Dosya yüklenemedi.");
      }
    } catch {
      setFile(null);
      alert("Dosya yüklenirken bir hata oluştu.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <form action={action} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <label
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border p-5 transition-all duration-200",
            type === "SUGGESTION"
              ? "border-primary bg-primary/5 shadow-[0_0_0_1px_var(--primary)]"
              : "border-border bg-transparent hover:bg-muted/50"
          )}
        >
          <input
            type="radio"
            name="type"
            value="SUGGESTION"
            checked={type === "SUGGESTION"}
            onChange={() => setType("SUGGESTION")}
            className="sr-only"
          />
          <div className={cn("flex size-10 items-center justify-center rounded-lg transition-colors", type === "SUGGESTION" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
            <HiOutlineLightBulb className="size-5" />
          </div>
          <span className={cn("font-medium text-sm mt-1", type === "SUGGESTION" ? "text-foreground" : "text-muted-foreground")}>
            Öneri
          </span>
        </label>

        <label
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border p-5 transition-all duration-200",
            type === "COMPLAINT"
              ? "border-primary bg-primary/5 shadow-[0_0_0_1px_var(--primary)]"
              : "border-border bg-transparent hover:bg-muted/50"
          )}
        >
          <input
            type="radio"
            name="type"
            value="COMPLAINT"
            checked={type === "COMPLAINT"}
            onChange={() => setType("COMPLAINT")}
            className="sr-only"
          />
          <div className={cn("flex size-10 items-center justify-center rounded-lg transition-colors", type === "COMPLAINT" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground")}>
            <HiOutlineMegaphone className="size-5" />
          </div>
          <span className={cn("font-medium text-sm mt-1", type === "COMPLAINT" ? "text-foreground" : "text-muted-foreground")}>
            Şikayet
          </span>
        </label>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Kategori (İsteğe Bağlı)</label>
        <select name="category" className="w-full rounded-xl border border-input bg-transparent px-4 py-2.5 text-sm outline-none focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary">
          <option value="">Bir kategori seçin...</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Mesajınız</label>
        <textarea
          name="content"
          required
          rows={6}
          placeholder="Lütfen durumunuzu detaylıca anlatın..."
          className="w-full rounded-xl border border-input bg-transparent p-4 text-sm outline-none transition-colors focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary resize-none placeholder:text-muted-foreground/60"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Dosya / Fotoğraf (İsteğe Bağlı)</label>
        <input type="hidden" name="attachmentUrl" value={attachmentUrl} />
        {!file && !uploading && (
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed p-4 text-sm text-muted-foreground hover:bg-muted/50 transition-colors">
            <HiOutlinePaperClip className="size-5" />
            <span>Ekstra bir dosya veya görüntü eklemek için tıklayın</span>
            <input type="file" className="sr-only" onChange={handleFileChange} accept="image/*,.pdf,.doc,.docx" />
          </label>
        )}
        {uploading && (
          <div className="flex items-center justify-center rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
            Yükleniyor...
          </div>
        )}
        {file && !uploading && (
          <div className="flex items-center justify-between rounded-xl border p-3 bg-muted/30">
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="flex size-8 shrink-0 items-center justify-center rounded bg-primary/10 text-primary">
                <HiOutlinePaperClip className="size-4" />
              </div>
              <span className="truncate text-sm font-medium">{file.name}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setFile(null);
                setAttachmentUrl("");
              }}
              className="p-2 text-muted-foreground hover:text-destructive transition-colors"
            >
              <HiOutlineXMark className="size-5" />
            </button>
          </div>
        )}
      </div>

      {state?.error && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm font-medium text-destructive">
          {state.error}
        </div>
      )}

      <SubmitButton />
    </form>
  );
}
