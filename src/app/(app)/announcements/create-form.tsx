"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { createAnnouncement } from "./actions";

const fieldClass =
  "w-full rounded-lg border border-input bg-background text-foreground dark:bg-zinc-900 dark:text-zinc-100 px-3 py-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="h-10" disabled={pending}>
      {pending ? "Yayınlanıyor…" : "Yayınla"}
    </Button>
  );
}

export function CreateAnnouncementForm() {
  const [state, action] = useActionState(createAnnouncement, undefined);
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) {
      toast.success("Duyuru yayınlandı.");
      ref.current?.reset();
    }
  }, [state]);

  return (
    <form ref={ref} action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="an-title">Başlık</Label>
          <Input
            id="an-title"
            name="title"
            required
            placeholder="ör. E-posta sunucusunda bakım"
            className="h-10"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="an-level">Seviye</Label>
          <select
            id="an-level"
            name="level"
            defaultValue="INFO"
            className={`${fieldClass} h-10`}
          >
            <option value="INFO">Bilgi</option>
            <option value="WARNING">Uyarı</option>
            <option value="OUTAGE">Kesinti</option>
          </select>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="an-body">Açıklama (opsiyonel)</Label>
        <textarea
          id="an-body"
          name="body"
          rows={2}
          placeholder="Detay…"
          className={fieldClass}
        />
      </div>
      {state?.error ? (
        <p className="text-sm text-destructive">{state.error}</p>
      ) : null}
      <SubmitButton />
    </form>
  );
}
