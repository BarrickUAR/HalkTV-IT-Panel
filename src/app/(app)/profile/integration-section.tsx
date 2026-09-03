"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import type { NotificationType, WebhookType } from "@prisma/client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  createWebhook,
  deleteWebhook,
  testWebhook,
  toggleWebhook,
} from "./integration-actions";

const EVENTS: { value: NotificationType; label: string }[] = [
  { value: "TICKET_CREATED", label: "Yeni talep" },
  { value: "TICKET_ASSIGNED", label: "Talep atandı" },
  { value: "TICKET_STATUS", label: "Durum değişti" },
  { value: "TICKET_COMMENT", label: "Yeni yorum" },
  { value: "SLA_WARNING", label: "SLA aşımı" },
  { value: "APPROVAL_REQUEST", label: "Onay talebi" },
  { value: "ANNOUNCEMENT", label: "Duyuru" },
];

const EVENT_LABEL = Object.fromEntries(
  EVENTS.map((e) => [e.value, e.label]),
) as Record<NotificationType, string>;

const fieldClass =
  "h-10 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="h-10">
      {pending ? "Ekleniyor…" : "Webhook Ekle"}
    </Button>
  );
}

type Hook = {
  id: string;
  name: string;
  type: WebhookType;
  url: string;
  events: NotificationType[];
  isActive: boolean;
};

function HookRow({ hook }: { hook: Hook }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <div className="flex flex-wrap items-start justify-between gap-3 px-5 py-3 text-sm">
      <div className="min-w-0">
        <p className="font-medium">
          {hook.name}{" "}
          <span className="text-xs text-muted-foreground">
            ({hook.type === "TEAMS" ? "Teams" : "Slack"})
          </span>
          {!hook.isActive ? (
            <span className="ml-1 text-xs text-muted-foreground">
              · pasif
            </span>
          ) : null}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {hook.events.map((e) => EVENT_LABEL[e] ?? e).join(", ")}
        </p>
      </div>
      <div className="flex shrink-0 gap-2">
        <Button
          size="sm"
          variant="outline"
          className="h-8"
          disabled={pending}
          onClick={() =>
            start(async () => {
              const r = await testWebhook(hook.id);
              if (r.ok) toast.success("Test mesajı başarıyla gönderildi.");
              else toast.error("Gönderilemedi, lütfen Webhook URL'sini kontrol edin.");
            })
          }
        >
          Test
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-8"
          disabled={pending}
          onClick={() =>
            start(async () => {
              await toggleWebhook(hook.id, !hook.isActive);
              toast.success(hook.isActive ? "Webhook duraklatıldı." : "Webhook aktifleştirildi.");
              router.refresh();
            })
          }
        >
          {hook.isActive ? "Duraklat" : "Aç"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-8 text-destructive"
          disabled={pending}
          onClick={() =>
            start(async () => {
              await deleteWebhook(hook.id);
              toast.success("Webhook entegrasyonu başarıyla silindi.");
              router.refresh();
            })
          }
        >
          Sil
        </Button>
      </div>
    </div>
  );
}

export function IntegrationSection({ webhooks }: { webhooks: Hook[] }) {
  const [state, action] = useActionState(createWebhook, undefined);
  const [selected, setSelected] = useState<NotificationType[]>([]);
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) {
      toast.success("Yeni Webhook entegrasyonu başarıyla eklendi.");
      ref.current?.reset();
      setSelected([]);
    }
  }, [state]);

  return (
    <section className="rounded-xl border bg-card p-6">
      <h2 className="mb-1 font-semibold">Teams / Slack Entegrasyonu</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Seçtiğin olaylar, gelen webhook adresine anlık olarak gönderilir.
      </p>

      {webhooks.length > 0 ? (
        <div className="mb-6 divide-y rounded-lg border">
          {webhooks.map((h) => (
            <HookRow key={h.id} hook={h} />
          ))}
        </div>
      ) : null}

      <form ref={ref} action={action} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="wh-name">İsim</Label>
            <Input
              id="wh-name"
              name="name"
              required
              placeholder="ör. IT Kanalı"
              className="h-10"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="wh-type">Tür</Label>
            <select id="wh-type" name="type" defaultValue="TEAMS" className={fieldClass}>
              <option value="TEAMS">Microsoft Teams</option>
              <option value="SLACK">Slack</option>
            </select>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="wh-url">Webhook URL</Label>
          <Input
            id="wh-url"
            name="url"
            type="url"
            required
            placeholder="https://…"
            className="h-10"
          />
        </div>
        <div className="space-y-2">
          <Label>Gönderilecek olaylar</Label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {EVENTS.map((e) => {
              const on = selected.includes(e.value);
              return (
                <label
                  key={e.value}
                  className="flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary/5"
                >
                  <input
                    type="checkbox"
                    name="events"
                    value={e.value}
                    checked={on}
                    onChange={(ev) =>
                      setSelected((prev) =>
                        ev.target.checked
                          ? [...prev, e.value]
                          : prev.filter((x) => x !== e.value),
                      )
                    }
                    className="size-4 accent-primary"
                  />
                  {e.label}
                </label>
              );
            })}
          </div>
        </div>
        {state?.error ? (
          <p className="text-sm text-destructive">{state.error}</p>
        ) : null}
        <SubmitButton />
      </form>
    </section>
  );
}
