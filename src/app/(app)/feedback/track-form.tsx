"use client";

import { useState } from "react";
import { HiOutlineMagnifyingGlass } from "react-icons/hi2";
import { Button } from "@/components/ui/button";

export function TrackFeedbackForm() {
  const [pin, setPin] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin.trim()) return;

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await fetch(`/api/feedback/track?pin=${encodeURIComponent(pin.trim())}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Sorgulama başarısız.");
      } else {
        setResult(data);
      }
    } catch {
      setError("Bir hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (s: string) => {
    switch(s) {
      case "NEW": return "bg-blue-500/10 text-blue-600 border-blue-500/20";
      case "IN_PROGRESS": return "bg-amber-500/10 text-amber-600 border-amber-500/20";
      case "RESOLVED": return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
      case "REJECTED": return "bg-red-500/10 text-red-600 border-red-500/20";
      default: return "bg-muted text-muted-foreground border-border";
    }
  };

  const getStatusLabel = (s: string) => {
    switch(s) {
      case "NEW": return "Yeni";
      case "IN_PROGRESS": return "İnceleniyor";
      case "RESOLVED": return "Çözüldü";
      case "REJECTED": return "Reddedildi";
      default: return s;
    }
  };

  return (
    <div className="space-y-6 max-w-lg mx-auto">
      <form onSubmit={handleTrack} className="flex gap-2">
        <input
          type="text"
          value={pin}
          onChange={(e) => setPin(e.target.value.toUpperCase())}
          placeholder="Örn: HTV-9B4X"
          className="flex-1 rounded-xl border border-input bg-transparent px-4 text-sm font-mono tracking-widest outline-none focus-visible:border-primary focus-visible:ring-1 focus-visible:ring-primary"
        />
        <Button type="submit" disabled={loading} className="h-11">
          <HiOutlineMagnifyingGlass className="size-5 mr-2" />
          Sorgula
        </Button>
      </form>

      {error && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive text-center">
          {error}
        </div>
      )}

      {result && (
        <div className="rounded-xl border bg-card p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Durum</span>
            <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${getStatusColor(result.status)}`}>
              {getStatusLabel(result.status)}
            </span>
          </div>

          <div className="space-y-1">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Tarih</span>
            <p className="text-sm font-medium">{new Date(result.createdAt).toLocaleString("tr-TR")}</p>
          </div>

          <div className="space-y-1">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Sizin Mesajınız</span>
            <div className="p-3 bg-muted/40 rounded-lg text-sm whitespace-pre-wrap leading-relaxed">
              {result.content}
            </div>
          </div>

          {result.adminResponse && (
            <div className="space-y-1 pt-2">
              <span className="text-xs font-semibold text-primary uppercase tracking-wider">Yönetici Cevabı</span>
              <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                {result.adminResponse}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
