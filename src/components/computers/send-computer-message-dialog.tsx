"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  HiOutlineChatBubbleLeftRight,
  HiOutlinePaperAirplane,
  HiOutlineXMark,
  HiOutlineExclamationTriangle,
  HiOutlineComputerDesktop,
  HiOutlineSparkles,
} from "react-icons/hi2";
import { sendComputerMessageAction } from "@/app/(app)/dashboard/computer-message-actions";

interface SendComputerMessageDialogProps {
  computer: {
    id?: string;
    name: string;
    user?: { name?: string | null; email?: string | null } | null;
    department?: { name?: string | null } | null;
    notes?: string | null;
  };
  variant?: "button" | "icon" | "ghost";
}

const PRESET_MESSAGES = [
  {
    label: "Yeniden Başlat",
    icon: "🔄",
    text: "Lütfen açık çalışmalarınızı kaydedip bilgisayarınızı yeniden başlatınız.",
  },
  {
    label: "AnyDesk Bağlantısı",
    icon: "🎧",
    text: "Teknik destek ekibi birazdan AnyDesk üzerinden cihazınıza bağlanacaktır. Lütfen cihaz başında bekleyiniz.",
  },
  {
    label: "Ağ / Sistem Bakımı",
    icon: "⚠️",
    text: "Kısa süreli yerel ağ ve sistem bakımı gerçekleştirilecektir. Kısa kesintiler yaşanabilir.",
  },
  {
    label: "Cihazı Açık Bırakın",
    icon: "🛑",
    text: "Lütfen mesai bitiminde bilgisayarınızı kapatmayınız, uzaktan sistem güncellemeleri uygulanacaktır.",
  },
  {
    label: "Canlı Destek",
    icon: "💬",
    text: "Lütfen konuyla ilgili olarak Kiosk Canlı Destek üzerinden IT ekibimizle iletişime geçiniz.",
  },
];

export function SendComputerMessageDialog({ computer, variant = "button" }: SendComputerMessageDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [isUrgent, setIsUrgent] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const ipMatch = computer.notes?.match(/IP:\s*([^\s|]+)/)?.[1];
  const winUser = computer.notes?.match(/Windows:\s*([^\s|]+)/)?.[1];

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || isPending) return;

    setIsPending(true);
    try {
      const res = await sendComputerMessageAction({
        computerId: computer.id,
        computerName: computer.name,
        message: message.trim(),
        urgent: isUrgent,
      });

      if (res.ok) {
        toast.success(`Mesaj ${computer.name} cihazına başarıyla iletildi.`);
        setIsOpen(false);
        setMessage("");
        setIsUrgent(false);
      } else {
        toast.error(res.error || "Mesaj gönderilemedi.");
      }
    } catch (err: any) {
      toast.error(err.message || "Beklenmedik bir hata oluştu.");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <>
      {variant === "icon" ? (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
          title={`${computer.name} cihazına mesaj gönder`}
        >
          <HiOutlineChatBubbleLeftRight className="size-4" />
        </button>
      ) : variant === "ghost" ? (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg text-primary hover:bg-primary/10 transition-colors"
        >
          <HiOutlinePaperAirplane className="size-3.5" />
          Mesaj
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 transition-all shadow-xs"
        >
          <HiOutlinePaperAirplane className="size-3.5" />
          Mesaj Gönder
        </button>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className="w-full max-w-lg rounded-2xl bg-card border shadow-2xl p-6 relative animate-in zoom-in-95 duration-150 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between border-b pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <HiOutlineComputerDesktop className="size-5" />
                  </div>
                  <h3 className="text-base font-bold text-foreground">
                    Cihaza Canlı Mesaj Gönder
                  </h3>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
                  <span className="font-mono font-bold px-2 py-0.5 rounded bg-muted text-foreground border">
                    {computer.name}
                  </span>
                  {ipMatch && (
                    <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-semibold">
                      IP: {ipMatch}
                    </span>
                  )}
                  {computer.department?.name && (
                    <span className="text-[11px] px-2 py-0.5 rounded bg-muted text-muted-foreground font-medium border">
                      {computer.department.name}
                    </span>
                  )}
                  {computer.user && (
                    <span className="text-[11px] px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium">
                      👤 {computer.user.name || computer.user.email}
                    </span>
                  )}
                  {winUser && winUser !== "-" && !computer.user && (
                    <span className="text-[11px] px-2 py-0.5 rounded bg-muted text-muted-foreground font-medium border">
                      Win: {winUser}
                    </span>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="size-8 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground flex items-center justify-center transition-colors"
              >
                <HiOutlineXMark className="size-5" />
              </button>
            </div>

            {/* Quick Presets */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 mb-2">
                <HiOutlineSparkles className="size-3.5 text-primary" />
                Hızlı Hazır Şablonlar (Tek tıkla ekle)
              </label>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_MESSAGES.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setMessage(preset.text)}
                    className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-md border bg-muted/40 hover:bg-muted text-foreground transition-colors text-left"
                  >
                    <span>{preset.icon}</span>
                    <span>{preset.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSend} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1.5">
                  Mesaj Metni <span className="text-destructive">*</span>
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Kullanıcının bilgisayar ekranında belirecek mesajı yazın..."
                  rows={4}
                  required
                  className="w-full rounded-xl border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all resize-none"
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  Bu mesaj, hedef bilgisayardaki <strong>HalkTV IT İstemcisine</strong> anlık Windows masaüstü bildirimi ve Kiosk ekran uyarısı olarak gönderilecektir.
                </p>
              </div>

              {/* Urgent Toggle */}
              <div className="flex items-center justify-between p-3 rounded-xl border bg-muted/30">
                <div className="flex items-center gap-2.5">
                  <div className={`p-2 rounded-lg ${isUrgent ? "bg-red-100 text-red-600" : "bg-muted text-muted-foreground"}`}>
                    <HiOutlineExclamationTriangle className="size-4" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold block text-foreground">
                      Acil / Öncelikli Uyarı Olarak Gönder
                    </span>
                    <span className="text-[11px] text-muted-foreground block">
                      Hedef ekranda kırmızı vurgulu ve sesli yüksek öncelikli bildirim tetikler.
                    </span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  id={`urgent-${computer.id || computer.name}`}
                  checked={isUrgent}
                  onChange={(e) => setIsUrgent(e.target.checked)}
                  className="size-4 rounded border-gray-300 text-red-600 focus:ring-red-500 cursor-pointer"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  disabled={isPending}
                  className="px-4 py-2 text-xs font-semibold rounded-lg border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={!message.trim() || isPending}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-all shadow-xs"
                >
                  <HiOutlinePaperAirplane className="size-3.5" />
                  {isPending ? "İletiliyor..." : "Mesajı İlet"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
