"use client";

import { useState } from "react";
import {
  HiOutlinePrinter,
  HiOutlineWifi,
  HiOutlineComputerDesktop,
  HiOutlineArrowTopRightOnSquare,
  HiOutlineXMark,
  HiOutlineCog6Tooth,
  HiOutlineSignal,
} from "react-icons/hi2";

type QuickIssueType = "MARSIS" | "PRINTER" | "NETWORK" | "REMOTE";

const MARSIS_PRESETS = [
  { name: "Marsis Haber Masası", url: "http://news" },
];

export function QuickReportButtons() {
  const [loading, setLoading] = useState<QuickIssueType | null>(null);
  const [result, setResult] = useState<{ ok: boolean; number?: string; error?: string; type?: QuickIssueType } | null>(null);
  const [actionNotice, setActionNotice] = useState<{
    text: string;
    actionText?: string;
    issueType?: QuickIssueType;
  } | null>(null);

  // Active view inside the card: null | "marsis-select" | "printers" | "network" | "remote"
  const [activeView, setActiveView] = useState<null | "marsis-select" | "printers" | "network" | "remote">(null);

  // Marsis Floor config
  const [marsisPreset, setMarsisPreset] = useState(MARSIS_PRESETS[0]);
  const [customMarsisUrl, setCustomMarsisUrl] = useState("");

  // Printers state
  const [printersList, setPrintersList] = useState<{ name: string; driver?: string; isPhysical?: boolean }[]>([]);
  const [printersLoading, setPrintersLoading] = useState(false);

  // Network state
  const [networkStatus, setNetworkStatus] = useState<any>(null);
  const [networkLoading, setNetworkLoading] = useState(false);

  // Remote state
  const [anydeskId, setAnydeskId] = useState("");
  const [anydeskDesc, setAnydeskDesc] = useState("");
  const [anydeskSent, setAnydeskSent] = useState(false);

  const handleReport = async (issueType: QuickIssueType, extraData?: { anydeskId?: string; description?: string }) => {
    if (loading) return;
    setLoading(issueType);
    setResult(null);
    try {
      const res = await fetch("/api/quick-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ issueType, ...extraData }),
      });
      const data = await res.json();
      setResult(data.ok
        ? { ok: true, number: data.ticket?.number, type: issueType }
        : { ok: false, error: data.error ?? "Bir hata oluştu.", type: issueType }
      );
      setTimeout(() => setResult(null), 6000);
    } catch {
      setResult({ ok: false, error: "Bağlantı hatası.", type: issueType });
      setTimeout(() => setResult(null), 4000);
    } finally {
      setLoading(null);
    }
  };

  const handleOpenMarsis = () => {
    window.open("http://news", "_blank");
    setActionNotice({
      text: "Marsis Haber Masası (http://news) yeni sekmede açıldı.",
      actionText: "Açılmıyor mu? IT'ye Bildir",
      issueType: "MARSIS",
    });
    setTimeout(() => setActionNotice(null), 12000);
  };

  const handleOpenPrinters = async () => {
    setActiveView("printers");
    setPrintersLoading(true);
    try {
      const res = await fetch("/api/system-printers");
      if (res.ok) {
        const data = await res.json();
        setPrintersList(data.printers || []);
      }
    } catch {} finally {
      setPrintersLoading(false);
    }
  };

  const handleOpenNetwork = async () => {
    setActiveView("network");
    setNetworkLoading(true);
    try {
      const res = await fetch(`/api/network-status?marsisUrl=${encodeURIComponent(marsisPreset.url)}`);
      if (res.ok) {
        const data = await res.json();
        setNetworkStatus(data);
      }
    } catch {} finally {
      setNetworkLoading(false);
    }
  };
  const handleOpenRemote = () => {
    window.open("https://download.anydesk.com/AnyDesk.exe", "_blank");
    setActiveView("remote");
  };

  const handleSendAnydesk = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!anydeskId.trim()) return;
    await handleReport("REMOTE", { anydeskId: anydeskId.trim(), description: anydeskDesc.trim() });
    setAnydeskSent(true);
    setTimeout(() => {
      setAnydeskSent(false);
      setActiveView(null);
    }, 4000);
  };

  return (
    <div className="rounded-2xl border bg-card shadow-sm p-5 relative overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-600">
            <span className="text-sm font-bold">⚡</span>
          </div>
          <div>
            <h2 className="text-sm font-bold leading-tight">Hızlı Bağlantı & Destek</h2>
            <p className="text-[11px] text-muted-foreground">Tek tıkla bağlan veya doğrudan IT ekibine ilet</p>
          </div>
        </div>

        {/* Marsis direct badge */}
        <span className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
          <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span>news</span>
        </span>
      </div>

      {/* Main 4 Action Grid */}
      <div className="grid grid-cols-2 gap-2.5">
        {/* 1. Marsis'e Bağlan */}
        <button
          onClick={handleOpenMarsis}
          className="group flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-background hover:bg-red-50/50 dark:hover:bg-red-950/20 hover:border-red-200 dark:hover:border-red-800 transition-all cursor-pointer text-center"
        >
          <img src="/marsis-logo.svg" alt="Marsis" className="h-5 object-contain transition-transform group-hover:scale-110" />
          <div className="leading-tight">
            <p className="text-[12px] font-bold text-slate-900 dark:text-slate-100 flex items-center justify-center gap-1">
              Marsis&apos;e Bağlan
              <HiOutlineArrowTopRightOnSquare className="size-3 text-red-600" />
            </p>
            <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400">http://news</p>
          </div>
        </button>

        {/* 2. Yazıcıya Bağlan */}
        <button
          onClick={handleOpenPrinters}
          className="group flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-background hover:bg-red-50/50 dark:hover:bg-red-950/20 hover:border-red-200 dark:hover:border-red-800 transition-all cursor-pointer text-center"
        >
          <HiOutlinePrinter className="size-6 text-red-600 transition-transform group-hover:scale-110" />
          <div className="leading-tight">
            <p className="text-[12px] font-bold text-slate-900 dark:text-slate-100">Yazıcıya Bağlan</p>
            <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400">Yazıcıları İncele</p>
          </div>
        </button>

        {/* 3. Ağ / Net Kontrol */}
        <button
          onClick={handleOpenNetwork}
          className="group flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-background hover:bg-red-50/50 dark:hover:bg-red-950/20 hover:border-red-200 dark:hover:border-red-800 transition-all cursor-pointer text-center"
        >
          <HiOutlineSignal className="size-6 text-red-600 transition-transform group-hover:scale-110" />
          <div className="leading-tight">
            <p className="text-[12px] font-bold text-slate-900 dark:text-slate-100">Ağ / Net Kontrol</p>
            <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400">Canlı Durum Testi</p>
          </div>
        </button>

        {/* 4. Uzaktan Destek */}
        <button
          onClick={handleOpenRemote}
          className="group flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-background hover:bg-red-50/50 dark:hover:bg-red-950/20 hover:border-red-200 dark:hover:border-red-800 transition-all cursor-pointer text-center"
        >
          <img src="/anydesk-logo.svg" alt="AnyDesk" className="size-6 object-contain rounded transition-transform group-hover:scale-110" />
          <div className="leading-tight">
            <p className="text-[12px] font-bold text-slate-900 dark:text-slate-100">Uzaktan Destek</p>
            <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400">AnyDesk İle Bağlan</p>
          </div>
        </button>
      </div>

      {/* Action feedback / Fallback Ticket notice */}
      {actionNotice && (
        <div className="mt-3 flex items-center justify-between rounded-lg px-3 py-2 text-xs font-semibold bg-blue-50 text-blue-800 border border-blue-200">
          <span className="truncate">{actionNotice.text}</span>
          {actionNotice.actionText && actionNotice.issueType && (
            <button
              onClick={() => {
                if (actionNotice.issueType) handleReport(actionNotice.issueType);
              }}
              disabled={loading !== null}
              className="ml-2 shrink-0 rounded bg-red-600 px-2 py-0.5 text-[11px] font-bold text-white hover:bg-red-700 cursor-pointer"
            >
              {actionNotice.actionText}
            </button>
          )}
        </div>
      )}

      {result && (
        <div
          className={`mt-3 rounded-lg px-3 py-2 text-center text-xs font-semibold border ${
            result.ok
              ? "bg-green-50 text-green-700 border-green-200"
              : "bg-red-50 text-red-700 border-red-200"
          }`}
        >
          {result.ok
            ? `✓ Talep oluşturuldu (${result.number}) — IT ekibi bilgilendirildi.`
            : `✗ ${result.error}`}
        </div>
      )}

      {/* ── DRAWER / MODAL OVERLAYS ── */}

      {/* 1. MARSIS KAT SEÇİMİ */}
      {activeView === "marsis-select" && (
        <div className="absolute inset-0 bg-card p-4 z-20 flex flex-col">
          <div className="flex items-center justify-between border-b pb-2 mb-3">
            <span className="text-xs font-bold text-foreground">Bulunduğunuz Katı / Marsis Sunucusunu Seçin</span>
            <button onClick={() => setActiveView(null)} className="text-muted-foreground hover:text-foreground">
              <HiOutlineXMark className="size-4" />
            </button>
          </div>
          <div className="space-y-2 flex-1 overflow-y-auto">
            {MARSIS_PRESETS.map((preset, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setMarsisPreset(preset);
                  setActiveView(null);
                  window.open(preset.url, "_blank");
                }}
                className={`w-full text-left p-2.5 rounded-xl border text-xs font-medium flex items-center justify-between transition-colors ${
                  marsisPreset.url === preset.url ? "border-primary bg-primary/5 font-bold" : "hover:bg-muted/50"
                }`}
              >
                <div>
                  <p className="font-bold text-foreground">{preset.name}</p>
                  <p className="text-[11px] text-muted-foreground font-mono">{preset.url}</p>
                </div>
                {marsisPreset.url === preset.url && <span className="text-primary font-bold text-[11px]">✓ Seçili</span>}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 2. YAZICILAR LİSTESİ */}
      {activeView === "printers" && (
        <div className="absolute inset-0 bg-card p-4 z-20 flex flex-col">
          <div className="flex items-center justify-between border-b pb-2 mb-3">
            <span className="text-xs font-bold flex items-center gap-1.5 text-amber-700">
              <HiOutlinePrinter className="size-4" /> Bağlı Yazıcılar
            </span>
            <button onClick={() => setActiveView(null)} className="text-muted-foreground hover:text-foreground">
              <HiOutlineXMark className="size-4" />
            </button>
          </div>
          {printersLoading ? (
            <p className="text-xs text-muted-foreground text-center my-auto">Yazıcılar taranıyor...</p>
          ) : (
            <div className="space-y-1.5 flex-1 overflow-y-auto pr-1">
              {printersList.map((p, i) => (
                <div key={i} className={`p-2 rounded-lg border text-xs flex items-center justify-between ${p.isPhysical ? "bg-amber-50/60 border-amber-200" : "bg-muted/30"}`}>
                  <div>
                    <p className={`font-semibold ${p.isPhysical ? "text-amber-950 font-bold" : "text-foreground"}`}>{p.name}</p>
                    {p.driver && <p className="text-[10px] text-muted-foreground">{p.driver}</p>}
                  </div>
                  {p.isPhysical && <span className="text-[10px] bg-amber-200 text-amber-900 px-1.5 py-0.5 rounded font-bold">Fiziksel</span>}
                </div>
              ))}
            </div>
          )}
          <div className="border-t pt-2 mt-2 flex gap-2">
            <button
              onClick={() => {
                setActiveView(null);
                handleReport("PRINTER");
              }}
              className="flex-1 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold cursor-pointer"
            >
              ⚠️ Yazıcı Sorunu Bildir (IT)
            </button>
          </div>
        </div>
      )}

      {/* 3. AĞ / İNTERNET TESTİ */}
      {activeView === "network" && (
        <div className="absolute inset-0 bg-card p-4 z-20 flex flex-col">
          <div className="flex items-center justify-between border-b pb-2 mb-3">
            <span className="text-xs font-bold flex items-center gap-1.5 text-blue-700">
              <HiOutlineWifi className="size-4" /> Canlı Ağ ve İnternet Durumu
            </span>
            <button onClick={() => setActiveView(null)} className="text-muted-foreground hover:text-foreground">
              <HiOutlineXMark className="size-4" />
            </button>
          </div>
          {networkLoading ? (
            <p className="text-xs text-muted-foreground text-center my-auto">Bağlantı test ediliyor...</p>
          ) : (
            <div className="space-y-2 flex-1">
              <div className="p-2.5 rounded-lg border bg-muted/30 flex items-center justify-between text-xs">
                <div>
                  <p className="font-bold">Marsis Sunucusu ({marsisPreset.url})</p>
                  <p className="text-[10px] text-muted-foreground">Yayın otomasyon bağlantısı</p>
                </div>
                <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${networkStatus?.marsis?.ok ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                  {networkStatus?.marsis?.ok ? "🟢 Erişilebilir" : "🔴 Ulaşılamıyor"}
                </span>
              </div>

              <div className="p-2.5 rounded-lg border bg-muted/30 flex items-center justify-between text-xs">
                <div>
                  <p className="font-bold">Genel İnternet</p>
                  <p className="text-[10px] text-muted-foreground">Dış dünya & Google erişimi</p>
                </div>
                <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${networkStatus?.internet?.ok ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                  {networkStatus?.internet?.ok ? "🟢 Aktif" : "🔴 Kesik"}
                </span>
              </div>

              <div className="p-2.5 rounded-lg border bg-muted/30 flex items-center justify-between text-xs">
                <div>
                  <p className="font-bold">
                    Yerel Ağ (Gateway: {networkStatus?.localGateway?.gateway || "Otomatik"})
                  </p>
                  <p className="text-[10px] text-muted-foreground">HalkTV Yerel Ağı</p>
                </div>
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-green-100 text-green-800">
                  🟢 Bağlı
                </span>
              </div>
            </div>
          )}
          <div className="border-t pt-2 mt-2 flex gap-2">
            <button
              onClick={handleOpenNetwork}
              className="px-3 py-1.5 rounded-lg bg-muted hover:bg-muted/80 text-foreground text-xs font-semibold cursor-pointer"
            >
              🔄 Yeniden Test Et
            </button>
            <button
              onClick={() => {
                setActiveView(null);
                handleReport("NETWORK");
              }}
              className="flex-1 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold cursor-pointer"
            >
              ⚠️ İnternet Kesintisi Bildir
            </button>
          </div>
        </div>
      )}

      {/* 4. UZAKTAN DESTEK (ANYDESK) */}
      {activeView === "remote" && (
        <div className="absolute inset-0 bg-card p-4 z-20 flex flex-col">
          <div className="flex items-center justify-between border-b pb-2 mb-3">
            <span className="text-xs font-bold flex items-center gap-1.5 text-red-700">
              <HiOutlineComputerDesktop className="size-4" /> AnyDesk Uzaktan Destek
            </span>
            <button onClick={() => setActiveView(null)} className="text-muted-foreground hover:text-foreground">
              <HiOutlineXMark className="size-4" />
            </button>
          </div>
          {anydeskSent ? (
            <div className="my-auto text-center">
              <p className="text-xl text-green-600">✓</p>
              <p className="text-xs font-bold text-green-600 mt-1">AnyDesk Bilgisi IT Ekibine İletildi!</p>
              <p className="text-[11px] text-muted-foreground mt-1">Lütfen AnyDesk penceresini kapatmayın ve gelen bağlantı isteğini kabul edin.</p>
            </div>
          ) : (
            <form onSubmit={handleSendAnydesk} className="space-y-2 flex-1 flex flex-col justify-center">
              <p className="text-[11px] text-muted-foreground">
                Yeni sekmede inen AnyDesk'i açın ve gördüğünüz <b>9 Haneli Adresi (ID)</b> girin:
              </p>
              <div>
                <input
                  type="text"
                  required
                  placeholder="AnyDesk ID (Örn: 123 456 789)"
                  value={anydeskId}
                  onChange={(e) => setAnydeskId(e.target.value)}
                  className="w-full text-xs font-bold p-2 rounded-lg border bg-background text-center tracking-widest"
                />
              </div>
              <div>
                <textarea
                  placeholder="Kısaca ne yapılacak? (İsteğe bağlı)"
                  value={anydeskDesc}
                  onChange={(e) => setAnydeskDesc(e.target.value)}
                  rows={2}
                  className="w-full text-[11px] p-2 rounded-lg border bg-background resize-none"
                />
              </div>
              <button
                type="submit"
                disabled={loading !== null}
                className="w-full py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold cursor-pointer transition-colors"
              >
                🚀 IT Ekibine Bağlantı İsteği Gönder
              </button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
