"use client";

import { useTransition } from "react";
import { HiOutlineCheck, HiOutlinePlay } from "react-icons/hi2";
import { updateTicketStatus } from "@/app/(app)/tickets/[id]/actions";
import { toast } from "sonner";
import type { TicketStatus } from "@prisma/client";
import { cn } from "@/lib/utils";

export function QuickStatusButton({
  ticketId,
  currentStatus,
}: {
  ticketId: string;
  currentStatus: TicketStatus;
}) {
  const [isPending, startTransition] = useTransition();

  if (currentStatus === "RESOLVED" || currentStatus === "CLOSED" || currentStatus === "CANCELLED") {
    return null;
  }

  const handleAction = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent navigating to ticket link

    startTransition(async () => {
      const nextStatus: TicketStatus = currentStatus === "OPEN" ? "IN_PROGRESS" : "RESOLVED";
      const res = await updateTicketStatus(ticketId, nextStatus);
      if (res.ok) {
        toast.success("Durum güncellendi");
      } else {
        toast.error("Hata oluştu");
      }
    });
  };

  return (
    <button
      disabled={isPending}
      onClick={handleAction}
      className={cn(
        "inline-flex h-8 items-center justify-center gap-1.5 rounded-md px-3 text-xs font-medium shadow-sm transition-colors",
        currentStatus === "OPEN"
          ? "bg-amber-500/10 text-amber-600 hover:bg-amber-500/20 dark:text-amber-400"
          : "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 dark:text-emerald-400",
        isPending && "opacity-50 cursor-not-allowed"
      )}
    >
      {currentStatus === "OPEN" ? (
        <>
          <HiOutlinePlay className="size-3.5" /> Başla
        </>
      ) : (
        <>
          <HiOutlineCheck className="size-3.5" /> Çöz
        </>
      )}
    </button>
  );
}
