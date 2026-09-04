"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { HiOutlineStar } from "react-icons/hi2";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { submitSurvey } from "./actions";

export function SurveyWidget({ ticketId }: { ticketId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");

  function submit() {
    if (!rating) {
      toast.error("Lütfen bir değerlendirme puanı seçin.");
      return;
    }
    start(async () => {
      const r = await submitSurvey(ticketId, rating, comment);
      if (r.ok) {
        toast.success("Değerlendirmeniz için teşekkür ederiz!");
        router.refresh();
      } else toast.error(r.error ?? "Değerlendirme gönderilirken bir hata oluştu.");
    });
  }

  return (
    <div className="rounded-xl border bg-card p-5">
      <h3 className="text-sm font-semibold">Hizmetimizi Değerlendirin</h3>
      <div className="mt-3 flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            onClick={() => setRating(n)}
            className="p-0.5"
            aria-label={`${n} yıldız`}
          >
            <HiOutlineStar
              className={cn(
                "size-7 transition-colors",
                (hover || rating) >= n
                  ? "fill-amber-400 text-amber-400"
                  : "text-muted-foreground",
              )}
            />
          </button>
        ))}
      </div>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={2}
        placeholder="Deneyiminizle ilgili eklemek istedikleriniz (İsteğe bağlı)"
        className="mt-3 w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
      />
      <Button size="sm" className="mt-3 h-9" disabled={pending} onClick={submit}>
        Değerlendirmeyi Gönder
      </Button>
    </div>
  );
}
