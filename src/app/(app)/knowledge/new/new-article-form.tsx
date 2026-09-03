"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CATEGORY_LABELS } from "@/lib/ticket-labels";
import { createArticleAction } from "../actions";

const CATEGORIES = ["HARDWARE", "SOFTWARE", "ACCOUNT_ACCESS", "NETWORK", "EMAIL", "OTHER"] as const;

function SubmitButton() {
  const { pending } = useFormStatus();
  return <Button type="submit" className="w-full h-11" disabled={pending}>{pending ? "Ekleniyor..." : "Makaleyi Yayınla"}</Button>;
}

export function NewArticleForm() {
  const [state, action] = useActionState(createArticleAction, undefined);

  return (
    <form action={action} className="space-y-6 max-w-2xl bg-card p-6 rounded-xl border mt-6">
      <div className="space-y-2">
        <Label htmlFor="title">Makale Başlığı</Label>
        <Input id="title" name="title" required placeholder="Örn: VPN Bağlantısı Kopuyor, Ne Yapmalıyım?" className="h-11" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="category">Kategori</Label>
        <select
          id="category"
          name="category"
          defaultValue="OTHER"
          className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 h-11"
        >
          {CATEGORIES.map(c => (
            <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="content">Çözüm / İçerik</Label>
        <textarea
          id="content"
          name="content"
          required
          rows={10}
          placeholder="Bu sorunun nasıl çözüleceğini detaylıca anlatın..."
          className="w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 resize-y"
        />
      </div>

      <div className="flex items-center gap-2">
        <input type="checkbox" id="isPublished" name="isPublished" defaultChecked className="size-4" />
        <Label htmlFor="isPublished">Hemen Yayına Al (Personel Görebilir)</Label>
      </div>

      {state?.error && <p className="text-sm text-destructive font-medium">{state.error}</p>}

      <SubmitButton />
    </form>
  );
}
