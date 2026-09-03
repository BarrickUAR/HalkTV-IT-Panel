"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { logTime } from "./actions";

export function TimeLog({ ticketId }: { ticketId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [minutes, setMinutes] = useState("");
  const [note, setNote] = useState("");

  function submit() {
    const m = parseInt(minutes, 10);
    if (!m || m <= 0) {
      toast.error("Dakika gir.");
      return;
    }
    start(async () => {
      const r = await logTime(ticketId, m, note);
      if (r.ok) {
        toast.success("Süre eklendi.");
        setMinutes("");
        setNote("");
        router.refresh();
      } else toast.error(r.error ?? "Olmadı.");
    });
  }

  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="space-y-1">
        <label className="text-xs text-muted-foreground">Dakika</label>
        <Input
          type="number"
          value={minutes}
          onChange={(e) => setMinutes(e.target.value)}
          placeholder="30"
          className="h-9 w-24"
        />
      </div>
      <div className="min-w-40 flex-1 space-y-1">
        <label className="text-xs text-muted-foreground">Not (opsiyonel)</label>
        <Input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Ne yapıldı"
          className="h-9"
        />
      </div>
      <Button size="sm" className="h-9" disabled={pending} onClick={submit}>
        Ekle
      </Button>
    </div>
  );
}
