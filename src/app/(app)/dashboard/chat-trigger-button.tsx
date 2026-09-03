"use client";

import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export function ChatTriggerButton() {
  return (
    <button
      type="button"
      onClick={() => {
        window.dispatchEvent(new Event("open-live-chat"));
      }}
      className={cn(
        buttonVariants({ variant: "outline" }),
        "rounded-xl px-6 font-semibold bg-white/10 text-white border-white/20 hover:bg-white/20 transition-all"
      )}
    >
      Canlı Destek'e Bağlan
    </button>
  );
}
