"use client";

import Link from "next/link";
import { useState } from "react";
import {
  HiOutlineComputerDesktop,
  HiOutlineArrowRight,
  HiOutlineMagnifyingGlass,
} from "react-icons/hi2";
import { SendComputerMessageDialog } from "@/components/computers/send-computer-message-dialog";

interface ActiveComputersWidgetProps {
  activeComputers: any[];
}

export function ActiveComputersWidget({ activeComputers }: ActiveComputersWidgetProps) {
  const [search, setSearch] = useState("");

  const filtered = activeComputers.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const nameMatch = c.name?.toLowerCase().includes(q);
    const deptMatch = c.department?.name?.toLowerCase().includes(q);
    const userMatch = c.user?.name?.toLowerCase().includes(q) || c.user?.email?.toLowerCase().includes(q);
    const notesMatch = c.notes?.toLowerCase().includes(q);
    return nameMatch || deptMatch || userMatch || notesMatch;
  });

  return (
    <div className="rounded-xl border bg-card shadow-xs overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b px-5 py-3.5 bg-muted/20">
        <div className="flex items-center gap-2.5">
          <span className="relative flex size-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full size-2.5 bg-emerald-500" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-foreground">Aktif Cihazlar & Kiosklar</h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300/60">
                {activeComputers.length} Canlı
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Ağdaki istemcileri canlı izleyin ve doğrudan masaüstlerine anlık mesaj iletin.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          {activeComputers.length > 3 && (
            <div className="relative w-44">
              <HiOutlineMagnifyingGlass className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder="Cihaz veya IP ara..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-2.5 py-1 text-xs rounded-lg border bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          )}
          <Link
            href="/inventory"
            className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline shrink-0"
          >
            Tüm Cihazlar <HiOutlineArrowRight className="size-3" />
          </Link>
        </div>
      </div>

      {/* Content */}
      {filtered.length === 0 ? (
        <div className="p-8 text-center text-sm text-muted-foreground">
          {search ? "Aramaya uygun aktif cihaz bulunamadı." : "Henüz sisteme bağlanan bir istemci cihaz bulunmuyor."}
        </div>
      ) : (
        <div className="divide-y">
          {filtered.map((c: any) => {
            const ipMatch = c.notes?.match(/IP:\s*([^\s|]+)/)?.[1];
            const winUser = c.notes?.match(/Windows:\s*([^\s|]+)/)?.[1];
            const lastSeen = c.notes?.match(/Son Görülme:\s*([^|]+)/)?.[1]?.trim();

            return (
              <div
                key={c.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-3 hover:bg-muted/30 transition-colors"
              >
                {/* Left: Device Info */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-muted border text-foreground">
                    <HiOutlineComputerDesktop className="size-5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold font-mono text-foreground truncate">{c.name}</p>
                      {c.department?.name && (
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-muted text-muted-foreground font-medium border shrink-0">
                          {c.department.name}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {c.user ? (
                        <span className="text-foreground font-medium">
                          Zimmet: {c.user.name || c.user.email}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">Serbest Cihaz</span>
                      )}
                      {winUser && winUser !== "-" && (
                        <span className="text-muted-foreground"> • Win: {winUser}</span>
                      )}
                    </p>
                  </div>
                </div>

                {/* Right: IP, Last Seen & Message Action */}
                <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0">
                  <div className="flex flex-col items-start sm:items-end gap-0.5">
                    {ipMatch ? (
                      <span className="font-mono font-bold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 px-2 py-0.5 rounded-md text-[11px] inline-flex items-center gap-1.5 shadow-xs">
                        <span className="size-1.5 rounded-full bg-emerald-500 inline-block animate-pulse" />
                        {ipMatch}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground font-mono">—</span>
                    )}
                    {lastSeen && (
                      <span className="text-[10px] text-muted-foreground">
                        {lastSeen}
                      </span>
                    )}
                  </div>

                  <SendComputerMessageDialog computer={c} variant="button" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
