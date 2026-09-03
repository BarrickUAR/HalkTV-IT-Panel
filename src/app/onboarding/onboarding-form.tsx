"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { completeOnboarding } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-base font-semibold text-primary-foreground shadow-sm transition-all hover:brightness-110 hover:scale-[1.01] active:scale-100 disabled:opacity-50"
    >
      {pending ? "Kaydediliyor..." : "Devam Et →"}
    </button>
  );
}

export function OnboardingForm({ departments }: { departments: any[] }) {
  const [state, action] = useActionState(completeOnboarding, undefined);

  return (
    <form action={action} className="flex flex-col gap-5 px-8 py-8">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="name" className="text-sm font-semibold text-foreground">
          Ad Soyad <span className="text-destructive">*</span>
        </label>
        <input
          id="name"
          name="name"
          type="text"
          required
          autoFocus
          placeholder="Adınız ve soyadınız"
          className="h-11 w-full rounded-xl border border-border bg-muted/40 px-4 text-sm outline-none transition-colors focus-visible:border-primary/60 focus-visible:bg-background focus-visible:ring-2 focus-visible:ring-primary/20"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="departmentId" className="text-sm font-semibold text-foreground">
          Departman
        </label>
        <select
          id="departmentId"
          name="departmentId"
          defaultValue=""
          className="h-11 w-full rounded-xl border border-border bg-muted/40 px-4 text-sm outline-none transition-colors focus-visible:border-primary/60 focus-visible:ring-2 focus-visible:ring-primary/20"
        >
          <option value="">— Departman seçin (opsiyonel) —</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="phone" className="text-sm font-semibold text-foreground">
          Telefon <span className="text-muted-foreground font-normal">(opsiyonel)</span>
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          placeholder="0 (5xx) xxx xx xx"
          className="h-11 w-full rounded-xl border border-border bg-muted/40 px-4 text-sm outline-none transition-colors focus-visible:border-primary/60 focus-visible:bg-background focus-visible:ring-2 focus-visible:ring-primary/20"
        />
      </div>

      {state?.error && <p className="text-sm text-destructive">{state.error}</p>}

      <SubmitButton />
    </form>
  );
}
