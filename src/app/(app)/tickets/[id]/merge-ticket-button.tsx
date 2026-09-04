"use client";

import { useState, useTransition } from "react";
import { HiOutlineArrowsPointingIn, HiOutlineXMark } from "react-icons/hi2";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { mergeTicket } from "./actions";

export function MergeTicketButton({ ticketId, ticketNumber }: { ticketId: string; ticketNumber: string }) {
  const [open, setOpen] = useState(false);
  const [targetNumber, setTargetNumber] = useState("");
  const [pending, startTransition] = useTransition();

  function handleMerge() {
    const trimmed = targetNumber.trim().replace(/^#/, "").toUpperCase();
    if (!trimmed) {
      toast.error("Lütfen hedef talep numarasını girin.");
      return;
    }

    startTransition(async () => {
      // Önce talep numarasından ID bul
      const res = await fetch(`/api/tickets/find-by-number?number=${encodeURIComponent(trimmed)}`);
      if (!res.ok) {
        toast.error("Talep bulunamadı. Numarayı kontrol edin.");
        return;
      }
      const { id: targetId } = await res.json();

      const result = await mergeTicket(ticketId, targetId);
      if (result.ok) {
        toast.success("Talepler başarıyla birleştirildi!");
        setOpen(false);
        setTargetNumber("");
      } else {
        toast.error(result.error ?? "Bir hata oluştu.");
      }
    });
  }

  return (
    <>
      <Button variant="outline" size="sm" className="gap-2 text-muted-foreground" onClick={() => setOpen(true)}>
        <HiOutlineArrowsPointingIn className="size-4" />
        Birleştir
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="relative w-96 rounded-2xl border bg-card p-6 shadow-xl">
            <button
              onClick={() => setOpen(false)}
              className="absolute right-3 top-3 p-1 rounded-lg hover:bg-muted text-muted-foreground"
            >
              <HiOutlineXMark className="size-5" />
            </button>
            <h3 className="text-base font-semibold mb-1">Talep Birleştir</h3>
            <p className="text-sm text-muted-foreground mb-4">
              <strong>{ticketNumber}</strong> numaralı talep, girdiğiniz talebe birleştirilecek ve kapatılacaktır.
            </p>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Hedef Talep Numarası
                </label>
                <input
                  value={targetNumber}
                  onChange={(e) => setTargetNumber(e.target.value)}
                  placeholder="Örn: HTK-0042"
                  className="w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/50"
                  onKeyDown={(e) => e.key === "Enter" && handleMerge()}
                />
              </div>

              <div className="flex gap-2 pt-1">
                <Button variant="outline" className="flex-1" onClick={() => setOpen(false)}>
                  Vazgeç
                </Button>
                <Button className="flex-1 gap-2" onClick={handleMerge} disabled={pending}>
                  <HiOutlineArrowsPointingIn className="size-4" />
                  {pending ? "Birleştiriliyor..." : "Birleştir"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
