"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import { HiOutlineLightBulb, HiOutlineMegaphone, HiOutlineCheckCircle } from "react-icons/hi2";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { submitFeedbackAction } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full h-11 text-base font-semibold" disabled={pending}>
      {pending ? "Gönderiliyor..." : "Anonim Olarak Gönder"}
    </Button>
  );
}

export function FeedbackForm() {
  const [state, action] = useActionState(submitFeedbackAction, undefined);
  const [type, setType] = useState<"COMPLAINT" | "SUGGESTION">("SUGGESTION");

  if (state?.ok) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <HiOutlineCheckCircle className="size-16 text-emerald-500 mb-4" />
        <h3 className="text-xl font-bold mb-2">Mesajınız İletildi!</h3>
        <p className="text-muted-foreground text-sm max-w-sm mx-auto">
          Düşüncelerinizi bizimle paylaştığınız için teşekkür ederiz. Mesajınız anonim olarak yönetim paneline ulaştı.
        </p>
        <Button 
          variant="outline" 
          className="mt-6"
          onClick={() => window.location.reload()}
        >
          Yeni Bir Mesaj Gönder
        </Button>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <label
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border p-4 transition-all",
            type === "SUGGESTION"
              ? "border-emerald-500 bg-emerald-500/10 shadow-sm ring-1 ring-emerald-500/20"
              : "border-border bg-card hover:bg-muted/50"
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
          <div className={cn("rounded-full p-2", type === "SUGGESTION" ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground")}>
            <HiOutlineLightBulb className="size-6" />
          </div>
          <span className={cn("font-semibold text-sm", type === "SUGGESTION" ? "text-foreground" : "text-muted-foreground")}>
            Öneri
          </span>
        </label>

        <label
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border p-4 transition-all",
            type === "COMPLAINT"
              ? "border-orange-500 bg-orange-500/10 shadow-sm ring-1 ring-orange-500/20"
              : "border-border bg-card hover:bg-muted/50"
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
          <div className={cn("rounded-full p-2", type === "COMPLAINT" ? "bg-orange-500 text-white" : "bg-muted text-muted-foreground")}>
            <HiOutlineMegaphone className="size-6" />
          </div>
          <span className={cn("font-semibold text-sm", type === "COMPLAINT" ? "text-foreground" : "text-muted-foreground")}>
            Şikayet
          </span>
        </label>
      </div>

      <div className="space-y-2">
        <textarea
          name="content"
          required
          rows={5}
          placeholder="Lütfen şikayet veya önerinizi buraya yazın..."
          className="w-full rounded-xl border border-input bg-muted/30 p-4 text-sm outline-none transition-colors focus-visible:bg-transparent focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 resize-none"
        />
      </div>

      {state?.error && (
        <div className="rounded-lg bg-destructive/10 p-3 text-sm font-semibold text-destructive">
          {state.error}
        </div>
      )}

      <SubmitButton />
    </form>
  );
}
