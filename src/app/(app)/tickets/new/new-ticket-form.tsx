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

export function NewTicketForm({
  departments = [],
}: {
  departments?: { id: string; name: string }[];
}) {
  const [state, action] = useActionState(createTicket, undefined);

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
    <form action={action} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="title">Başlık</Label>
        <Input
          id="title"
          name="title"
          required
          placeholder="Sorunu kısaca özetle"
          className="h-11"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="category">Kategori</Label>
          <select
            id="category"
            name="category"
            defaultValue="HARDWARE"
            className={fieldClass}
          >
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {CATEGORY_LABELS[cat]}
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
          {deptList.map((d) => (
            <option key={d.id} value={d.name}>
              {d.name}
            </option>
          ))}
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
