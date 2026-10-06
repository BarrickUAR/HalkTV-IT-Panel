"use client";

import { useState } from "react";
import { toast } from "sonner";
import { HiOutlineClipboardDocument, HiOutlineCheck } from "react-icons/hi2";

export function CopyIpButton({ ip }: { ip: string }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(ip);
    setCopied(true);
    toast.success(`IP adresi panoya kopyalandı: ${ip}`);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      type="button"
      onClick={copy}
      title="IP Adresini Kopyala"
      className="inline-flex items-center gap-1.5 font-mono font-bold text-blue-700 bg-blue-50/90 hover:bg-blue-100 border border-blue-200/90 px-2 py-0.5 rounded text-[11px] transition-colors cursor-pointer group shadow-xs"
    >
      <span className="size-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
      <span>{ip}</span>
      {copied ? (
        <HiOutlineCheck className="size-3 text-emerald-600 shrink-0" />
      ) : (
        <HiOutlineClipboardDocument className="size-3 text-blue-400 group-hover:text-blue-700 transition-colors shrink-0" />
      )}
    </button>
  );
}
