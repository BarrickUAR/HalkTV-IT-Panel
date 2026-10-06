"use client";

import { useState } from "react";
import Link from "next/link";
import {
  HiOutlineMagnifyingGlass,
  HiOutlineUser,
  HiOutlineComputerDesktop,
  HiOutlineSignal,
  HiOutlinePaperAirplane,
  HiOutlineSparkles,
} from "react-icons/hi2";

import { Input } from "@/components/ui/input";
import { ROLE_LABELS } from "@/lib/rbac/roles";
import { cn } from "@/lib/utils";
import { SendComputerMessageDialog } from "@/components/computers/send-computer-message-dialog";

interface UserItem {
  id: string;
  name: string | null;
  email: string | null;
  title: string | null;
  role: string;
}

interface ComputerItem {
  id: string;
  name: string;
  notes: string | null;
  updatedAt: string | Date;
  user?: { name?: string | null; email?: string | null } | null;
  department?: { name?: string | null } | null;
}

interface MessagesClientProps {
  users: UserItem[];
  unreadMap: Record<string, number>;
  computers: ComputerItem[];
  isItStaff: boolean;
}

export function MessagesClient({
  users,
  unreadMap,
  computers,
  isItStaff,
}: MessagesClientProps) {
  const [activeTab, setActiveTab] = useState<"users" | "computers">("users");
  const [search, setSearch] = useState("");
  const [customPcName, setCustomPcName] = useState("");
  const [showCustomPcModal, setShowCustomPcModal] = useState(false);

  const filteredUsers = users.filter((u) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (u.name && u.name.toLowerCase().includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q)) ||
      (u.title && u.title.toLowerCase().includes(q))
    );
  });

  const filteredComputers = computers.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.notes && c.notes.toLowerCase().includes(q)) ||
      (c.department?.name && c.department.name.toLowerCase().includes(q)) ||
      (c.user?.name && c.user.name.toLowerCase().includes(q))
    );
  });

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Mesajlar & Bildirimler</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isItStaff
              ? "Personellerle birebir mesajlaşın veya kurumsal bilgisayarlara canlı bildirim gönderin."
              : "Bir kişiye tıkla, sohbete başla."}
          </p>
        </div>

        {/* Tab Toggle (Only for IT Staff) */}
        {isItStaff && (
          <div className="flex items-center bg-muted/70 p-1 rounded-xl border">
            <button
              type="button"
              onClick={() => setActiveTab("users")}
              className={cn(
                "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                activeTab === "users"
                  ? "bg-card text-foreground shadow-xs"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <HiOutlineUser className="size-4" />
              <span>Personeller ({users.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("computers")}
              className={cn(
                "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                activeTab === "computers"
                  ? "bg-card text-foreground shadow-xs text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <HiOutlineComputerDesktop className="size-4" />
              <span>Bilgisayarlar & Kiosklar ({computers.length})</span>
            </button>
          </div>
        )}
      </div>

      {/* Search & Action Bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <HiOutlineMagnifyingGlass className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={
              activeTab === "users"
                ? "Personel adı, e-posta veya unvan ara..."
                : "Bilgisayar adı, IP, departman veya zimmetli kullanıcı ara..."
            }
            className="h-11 pl-9 bg-card"
          />
        </div>

        {activeTab === "computers" && (
          <div className="flex items-center gap-2">
            <SendComputerMessageDialog
              computer={{ name: "GENEL_DUYURU" }}
              variant="button"
            />
          </div>
        )}
      </div>

      {/* TAB 1: USERS LIST */}
      {activeTab === "users" && (
        <>
          {filteredUsers.length === 0 ? (
            <div className="rounded-xl border bg-card p-12 text-center text-sm text-muted-foreground">
              Kişi bulunamadı.
            </div>
          ) : (
            <div className="divide-y rounded-xl border bg-card">
              {filteredUsers.map((u) => {
                const count = unreadMap[u.id] ?? 0;
                return (
                  <Link
                    key={u.id}
                    href={`/messages/${u.id}`}
                    className="flex items-center gap-3.5 px-4 py-3.5 hover:bg-muted/40 transition-colors"
                  >
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm">
                      {u.name
                        ? u.name
                            .split(" ")
                            .map((p) => p[0])
                            .slice(0, 2)
                            .join("")
                            .toUpperCase()
                        : "U"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {u.name ?? u.email}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {u.title ?? (ROLE_LABELS as any)[u.role] ?? u.role}
                      </p>
                    </div>
                    {count > 0 ? (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-primary-foreground">
                        {count > 9 ? "9+" : count}
                      </span>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* TAB 2: COMPUTERS & KIOSKS LIST (For IT Staff) */}
      {activeTab === "computers" && (
        <div className="space-y-3">
          <div className="rounded-lg bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-800/40 p-3.5 flex items-start gap-3">
            <HiOutlineSparkles className="size-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <p className="font-semibold text-blue-900 dark:text-blue-200">
                Doğrudan Cihaza / Kiosk Ekranına Bildirim Gönderme
              </p>
              <p className="text-blue-700/90 dark:text-blue-300/80 leading-relaxed">
                Buradan gönderdiğiniz mesajlar, bilgisayarın sağ altındaki Kiosk ekranında anlık olarak fırlar. Cihazda kullanıcı oturumu açık olmasa bile pop-up olarak görüntülenir.
              </p>
            </div>
          </div>

          {filteredComputers.length === 0 ? (
            <div className="rounded-xl border bg-card p-12 text-center text-sm text-muted-foreground">
              Kayıtlı bilgisayar bulunamadı.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredComputers.map((c) => {
                const ipMatch = c.notes?.match(/IP:\s*([^\s|]+)/)?.[1];
                const winUser = c.notes?.match(/Windows:\s*([^\s|]+)/)?.[1];

                return (
                  <div
                    key={c.id || c.name}
                    className="p-4 rounded-xl border bg-card hover:border-primary/40 transition-all flex flex-col justify-between gap-3 shadow-xs"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="size-8 rounded-lg bg-muted flex items-center justify-center text-foreground">
                            <HiOutlineComputerDesktop className="size-4.5" />
                          </div>
                          <div>
                            <span className="font-mono text-sm font-bold text-foreground block">
                              {c.name}
                            </span>
                            {c.department?.name && (
                              <span className="text-[11px] text-muted-foreground">
                                {c.department.name}
                              </span>
                            )}
                          </div>
                        </div>
                        {ipMatch && (
                          <span className="font-mono text-[10.5px] px-2 py-0.5 rounded bg-muted/80 text-muted-foreground border font-semibold">
                            {ipMatch}
                          </span>
                        )}
                      </div>

                      {/* User & Windows info */}
                      <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-1.5 pt-1">
                        {c.user ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 font-medium border border-emerald-200 dark:border-emerald-800">
                            👤 {c.user.name || c.user.email}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-muted text-muted-foreground font-medium border">
                            👤 Misafir / Ortak Masa
                          </span>
                        )}
                        {winUser && winUser !== "-" && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted/60 text-muted-foreground font-mono text-[10.5px]">
                            Win: {winUser}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="pt-2 border-t flex items-center justify-between">
                      <span className="text-[10.5px] text-muted-foreground">
                        {new Date(c.updatedAt).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })} aktif
                      </span>
                      <SendComputerMessageDialog
                        computer={c}
                        variant="button"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
