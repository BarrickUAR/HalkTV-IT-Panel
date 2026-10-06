"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SYSTEM_FLOORS } from "@/lib/floors";
import { createDepartmentAction } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="h-10 px-5">
      {pending ? "Ekleniyor..." : "Departman Ekle"}
    </Button>
  );
}

export function DepartmentForm() {
  const [state, action] = useActionState(createDepartmentAction, undefined);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) {
      toast.success("Departman başarıyla eklendi.");
      formRef.current?.reset();
    } else if (state?.error) {
      toast.error(state.error);
    }
  }, [state]);

  return (
    <form ref={formRef} action={action} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-muted/30 p-4 rounded-xl border">
      <Input
        name="name"
        placeholder="Yeni Departman Adı (ör: Haber Merkezi, Reji, Muhasebe)"
        required
        className="max-w-md bg-background h-10"
      />
      <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
        <select
          name="floor"
          required
          defaultValue=""
          className="h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          <option value="" disabled>— Kat Seçiniz —</option>
          {SYSTEM_FLOORS.map((sf) => (
            <option key={sf} value={sf}>{sf}</option>
          ))}
          <option value="-1. Kat">-1. Kat</option>
          <option value="Saha">Saha / Dış Çekim</option>
        </select>
      </div>
      <SubmitButton />
    </form>
  );
}
