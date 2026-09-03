"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
      <SubmitButton />
    </form>
  );
}
