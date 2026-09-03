"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CATEGORY_LABELS, PRIORITY_LABELS } from "@/lib/ticket-labels";

import { createTicket } from "../actions";

const CATEGORIES = [
  "HARDWARE",
  "SOFTWARE",
  "ACCOUNT_ACCESS",
  "NETWORK",
  "EMAIL",
  "OTHER",
] as const;
const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;

const fieldClass =
  "w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="h-11 w-full" disabled={pending}>
      {pending ? "Gönderiliyor…" : "Talebi Oluştur"}
    </Button>
  );
}

export function NewTicketForm() {
  const [state, action] = useActionState(createTicket, undefined);

  return (
    <form action={action} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="title">Başlık</Label>
        <Input
          id="title"
          name="title"
          required
          placeholder="Kısa özet — ör. Yazıcı çalışmıyor"
          className="h-11"
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="category">Kategori</Label>
          <select
            id="category"
            name="category"
            defaultValue="OTHER"
            className={fieldClass}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="priority">Öncelik</Label>
          <select
            id="priority"
            name="priority"
            defaultValue="MEDIUM"
            className={fieldClass}
          >
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {PRIORITY_LABELS[p]}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="location">Kat / Departman</Label>
        <select
          id="location"
          name="location"
          className={fieldClass}
          defaultValue=""
          required
        >
          <option value="" disabled>Lütfen bulunduğunuz yeri seçin</option>
          <option value="Haber Merkezi">Haber Merkezi</option>
          <option value="Editör Katı">Editör Katı</option>
          <option value="Reji">Reji</option>
          <option value="Teknik">Teknik</option>
          <option value="Prodüksiyon">Prodüksiyon</option>
          <option value="İnsan Kaynakları">İnsan Kaynakları</option>
          <option value="Muhasebe">Muhasebe</option>
          <option value="Yönetim">Yönetim</option>
          <option value="Diğer (Açıklamada belirtin)">Diğer (Açıklamada belirtin)</option>
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Açıklama</Label>
        <textarea
          id="description"
          name="description"
          required
          rows={6}
          placeholder="Ne oldu, ne zaman başladı, hangi cihaz/uygulama? Olabildiğince detay ver."
          className={fieldClass}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="attachment">Ekstra Görsel / Dosya (Opsiyonel)</Label>
        <Input
          id="attachment"
          name="attachment"
          type="file"
          accept="image/*,.pdf,.doc,.docx"
          className="cursor-pointer file:text-muted-foreground file:font-medium"
        />
        <p className="text-xs text-muted-foreground">
          Ekran görüntüsü veya hatanın fotoğrafını ekleyebilirsiniz (Maks: 5MB).
        </p>
      </div>

      {state?.error ? (
        <p className="text-sm text-destructive">{state.error}</p>
      ) : null}

      <SubmitButton />
    </form>
  );
}
