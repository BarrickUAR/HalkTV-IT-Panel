"use client";

import { useState, useTransition } from "react";
import { HiOutlineArrowsPointingIn, HiOutlineXMark, HiOutlineMagnifyingGlass } from "react-icons/hi2";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { mergeTicket } from "./actions";

type TicketOption = { id: string; number: string; title: string };

export function MergeTicketButton({
  ticketId,
  ticketNumber,
  tickets,
}: {
  ticketId: string;
  ticketNumber: string;
  tickets: TicketOption[];
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<TicketOption | null>(null);
  const [pending, startTransition] = useTransition();

  const filtered = tickets
    .filter((t) => t.id !== ticketId)
    .filter(
      (t) =>
        t.number.toLowerCase().includes(search.toLowerCase()) ||
        t.title.toLowerCase().includes(search.toLowerCase()),
    );

  function handleMerge() {
    if (!selected) {
      toast.error("Lütfen bir talep seçin.");
      return;
    }
    startTransition(async () => {
      const result = await mergeTicket(ticketId, selected.id);
      if (result.ok) {
        toast.success(`${ticketNumber} numaralı talep ${selected.number} ile birleştirildi.`);
        setOpen(false);
        setSelected(null);
        setSearch("");
      } else {
        toast.error(result.error ?? "Bir hata oluştu.");
      }
    });
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="gap-2 text-muted-foreground"
        onClick={() => setOpen(true)}
      >
        <HiOutlineArrowsPointingIn className="size-4" />
        Birleştir
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="relative w-[480px] max-h-[90vh] flex flex-col rounded-2xl border bg-card shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b">
              <div>
                <h3 className="text-base font-semibold">Talep Birleştir</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  <strong>{ticketNumber}</strong> seçilen taleple birleştirilecek ve kapatılacak.
                </p>
              </div>
              <button
                onClick={() => { setOpen(false); setSelected(null); setSearch(""); }}
                className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"
              >
                <HiOutlineXMark className="size-5" />
              </button>
            </div>

            {/* Search */}
            <div className="p-4 border-b">
              <div className="flex items-center gap-2 rounded-xl border bg-background px-3 focus-within:ring-2 focus-within:ring-primary/50">
                <HiOutlineMagnifyingGlass className="size-4 text-muted-foreground shrink-0" />
                <input
                  autoFocus
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Talep numarası veya başlık ara..."
                  className="h-10 w-full bg-transparent text-sm outline-none"
                />
              </div>
            </div>

            {/* Ticket List */}
            <div className="flex-1 overflow-y-auto p-2 min-h-0">
              {filtered.length === 0 ? (
                <p className="p-6 text-center text-sm text-muted-foreground">Talep bulunamadı.</p>
              ) : (
                filtered.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setSelected(t)}
                    className={`w-full text-left rounded-xl p-3 transition-colors ${
                      selected?.id === t.id
                        ? "bg-primary/10 border border-primary/30"
                        : "hover:bg-muted border border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-primary/80 shrink-0">{t.number}</span>
                      <span className="text-sm font-medium truncate">{t.title}</span>
                    </div>
                  </button>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="flex gap-2 p-4 border-t">
              <Button variant="outline" className="flex-1" onClick={() => { setOpen(false); setSelected(null); setSearch(""); }}>
                Vazgeç
              </Button>
              <Button
                className="flex-1 gap-2"
                onClick={handleMerge}
                disabled={pending || !selected}
              >
                <HiOutlineArrowsPointingIn className="size-4" />
                {pending ? "Birleştiriliyor..." : `Birleştir${selected ? ` → ${selected.number}` : ""}`}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
