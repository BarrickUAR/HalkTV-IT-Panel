"use client";

import { useState } from "react";
import { HiOutlineQrCode, HiOutlinePrinter, HiOutlineXMark } from "react-icons/hi2";
import { Button } from "@/components/ui/button";

type Props = {
  computerName: string;
  computerDepartment?: string;
  computerUser?: string;
};

export function QRPrintButton({ computerName, computerDepartment, computerUser }: Props) {
  const [showModal, setShowModal] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function generateQR() {
    setLoading(true);
    setShowModal(true);
    try {
      const QRCode = await import("qrcode");
      const ticketUrl = `${window.location.origin}/tickets/new?bilgisayar=${encodeURIComponent(computerName)}`;
      const url = await QRCode.toDataURL(ticketUrl, {
        width: 300,
        margin: 2,
        color: { dark: "#000000", light: "#ffffff" },
      });
      setQrDataUrl(url);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  function handlePrint() {
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR Etiket - ${computerName}</title>
          <style>
            body { font-family: Arial, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: white; }
            .label { border: 2px solid #000; border-radius: 12px; padding: 20px; text-align: center; width: 280px; }
            .label img { width: 200px; height: 200px; }
            .label h2 { font-size: 18px; font-weight: bold; margin: 8px 0 4px; }
            .label p { font-size: 12px; color: #555; margin: 2px 0; }
            .label .hint { font-size: 11px; color: #888; margin-top: 10px; border-top: 1px solid #eee; padding-top: 8px; }
            @media print { body { display: block; } .label { margin: 20px auto; } }
          </style>
        </head>
        <body>
          <div class="label">
            <img src="${qrDataUrl}" alt="QR Kod" />
            <h2>${computerName}</h2>
            ${computerDepartment ? `<p>📍 ${computerDepartment}</p>` : ""}
            ${computerUser ? `<p>👤 ${computerUser}</p>` : ""}
            <p class="hint">Bu QR kodu okutarak IT'ye<br>destek talebi oluşturabilirsiniz.</p>
          </div>
          <script>window.onload = () => { window.print(); window.close(); }<\/script>
        </body>
      </html>
    `);
    win.document.close();
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        title="QR Etiket Yazdır"
        onClick={generateQR}
        className="h-8 w-8 text-muted-foreground hover:text-foreground"
      >
        <HiOutlineQrCode className="size-4" />
      </Button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="relative w-80 rounded-2xl border bg-card p-6 shadow-xl text-center">
            <button
              onClick={() => { setShowModal(false); setQrDataUrl(null); }}
              className="absolute right-3 top-3 p-1 rounded-lg hover:bg-muted text-muted-foreground"
            >
              <HiOutlineXMark className="size-5" />
            </button>
            <h3 className="text-base font-semibold mb-1">QR Etiket</h3>
            <p className="text-xs text-muted-foreground mb-4">{computerName}</p>
            {loading ? (
              <div className="h-48 flex items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : qrDataUrl ? (
              <>
                <img src={qrDataUrl} alt="QR" className="mx-auto w-48 h-48 rounded-xl border" />
                {computerDepartment && <p className="text-xs text-muted-foreground mt-2">📍 {computerDepartment}</p>}
                {computerUser && <p className="text-xs text-muted-foreground">👤 {computerUser}</p>}
                <Button onClick={handlePrint} className="mt-4 w-full gap-2">
                  <HiOutlinePrinter className="size-4" />
                  Yazdır
                </Button>
              </>
            ) : null}
          </div>
        </div>
      )}
    </>
  );
}
