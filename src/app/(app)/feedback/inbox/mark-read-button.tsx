"use client";

import { useTransition } from "react";
import { HiOutlineCheck } from "react-icons/hi2";
import { Button } from "@/components/ui/button";
import { markFeedbackReadAction } from "../actions";

export function MarkReadButton({ id }: { id: string }) {
  const [pending, start] = useTransition();

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      className="gap-2 h-8 text-xs text-muted-foreground hover:text-foreground"
      onClick={() => start(async () => { await markFeedbackReadAction(id); })}
    >
      <HiOutlineCheck className="size-4" /> Okundu İşaretle
    </Button>
  );
}
