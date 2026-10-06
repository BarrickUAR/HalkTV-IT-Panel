import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { isITStaff } from "@/lib/rbac/permissions";
import { redirect } from "next/navigation";
import { ComputerDialog } from "./computer-dialog";
import { QRPrintButton } from "./qr-print-button";
import { CopyIpButton } from "./copy-ip-button";
import { SendComputerMessageDialog } from "@/components/computers/send-computer-message-dialog";
import { RemoteCommandDialog } from "@/components/computers/remote-command-dialog";
import { SystemEventsPanel } from "@/components/computers/system-events-panel";
import {
  HiOutlineComputerDesktop,
  HiOutlineBuildingOffice2,
  HiOutlineUser,
  HiOutlineMagnifyingGlass,
  HiOutlineGlobeAlt,
  HiOutlineUserGroup,
  HiOutlineXMark,
  HiOutlineBolt,
  HiOutlineExclamationTriangle,
  HiOutlineSignal,
} from "react-icons/hi2";

export const metadata: Metadata = {
  title: "Cihazlar & Canlı Ağ",
};

export default async function InventoryPage(props: {
  searchParams: Promise<{ q?: string; dept?: string }>;
}) {
  const user = await requireUser();
  if (!isITStaff(user.role)) redirect("/dashboard");

  const searchParams = await props.searchParams;
  const q = searchParams.q?.trim() ?? "";
  const deptFilter = searchParams.dept?.trim() ?? "";

  const [allComputers, departments, users] = await Promise.all([
    prisma.computer.findMany({
      include: {
        department: { select: { id: true, name: true } },
        user: { select: { id: true, name: true, email: true, image: true } },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.department.findMany({
      select: { id: true, name: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    }),
    prisma.user.findMany({
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    }),
  ]);

  // Metrics
  const now = Date.now();
  const totalCount = allComputers.length;
  const withIpCount = allComputers.filter((c) => /IP:\s*([^\s|]+)/.test(c.notes || "")).length;
  const assignedCount = allComputers.filter((c) => !!c.userId).length;
  const unassignedCount = totalCount - assignedCount;

  const onlineCount = allComputers.filter((c) => {
    const hb = c.notes?.match(/Heartbeat:\s*([^|]+)/)?.[1]?.trim();
    if (hb) {
      const diff = now - new Date(hb).getTime();
      return !isNaN(diff) && diff < 180000;
    }
    const diff = now - new Date(c.updatedAt).getTime();
    return !isNaN(diff) && diff < 180000;
  }).length;

  const criticalDiskCount = allComputers.filter((c) => {
    const dm = c.notes?.match(/Disk:\s*([^|]+)/)?.[1]?.trim();
    if (dm) {
      const freeNum = parseFloat(dm.split("GB")[0]);
      return !isNaN(freeNum) && freeNum < 15;
    }
    return false;
  }).length;

  // Filter computers by q and dept
  const filteredComputers = allComputers.filter((c) => {
    if (deptFilter && c.departmentId !== deptFilter) return false;
    if (!q) return true;
    const lowerQ = q.toLowerCase();
    const nameMatch = c.name.toLowerCase().includes(lowerQ);
    const notesMatch = (c.notes || "").toLowerCase().includes(lowerQ);
    const userMatch =
      (c.user?.name || "").toLowerCase().includes(lowerQ) ||
      (c.user?.email || "").toLowerCase().includes(lowerQ);
    const deptMatch = (c.department?.name || "").toLowerCase().includes(lowerQ);
    return nameMatch || notesMatch || userMatch || deptMatch;
  });

  return (
    <div className="w-full max-w-full space-y-6 px-1">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Cihazlar & Canlı Ağ</h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Canlı Takip
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Kurumdaki tüm bilgisayarlar, donanım telemetrisi, canlı ağ durumu ve zimmet bilgileri.
          </p>
        </div>
        <ComputerDialog departments={departments} users={users} />
      </div>

      {/* Metric Cards (5 Kolon) */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="rounded-xl border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Toplam Cihaz</span>
            <div className="p-1.5 rounded-lg bg-muted text-muted-foreground">
              <HiOutlineComputerDesktop className="size-4" />
            </div>
          </div>
          <p className="text-2xl font-bold mt-2 text-foreground">{totalCount}</p>
          <span className="text-[11px] text-muted-foreground">Envanterdeki makineler</span>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Canlı Çevrimiçi</span>
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
              <HiOutlineSignal className="size-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-1.5 mt-2">
            <span className="text-2xl font-bold text-emerald-700">{onlineCount}</span>
            <span className="text-xs text-muted-foreground">/ {totalCount}</span>
          </div>
          <span className="text-[11px] text-emerald-600 font-medium">Son 3 dk aktif sinyal</span>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Ağda Tespit Edilen</span>
            <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
              <HiOutlineGlobeAlt className="size-4" />
            </div>
          </div>
          <p className="text-2xl font-bold mt-2 text-blue-700">{withIpCount}</p>
          <span className="text-[11px] text-muted-foreground">Yerel IP atanmış cihaz</span>
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Zimmetli Cihazlar</span>
            <div className="p-1.5 rounded-lg bg-muted text-muted-foreground">
              <HiOutlineUser className="size-4" />
            </div>
          </div>
          <p className="text-2xl font-bold mt-2 text-foreground">{assignedCount}</p>
          <span className="text-[11px] text-muted-foreground">Personele tahsisli</span>
        </div>

        <div className={`rounded-xl border p-4 shadow-xs ${criticalDiskCount > 0 ? "bg-rose-50/70 border-rose-200" : "bg-card"}`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-semibold ${criticalDiskCount > 0 ? "text-rose-800 font-bold" : "text-muted-foreground"}`}>
              Kritik Disk (&lt;15GB)
            </span>
            <div className={`p-1.5 rounded-lg ${criticalDiskCount > 0 ? "bg-rose-100 text-rose-700" : "bg-muted text-muted-foreground"}`}>
              <HiOutlineExclamationTriangle className="size-4" />
            </div>
          </div>
          <p className={`text-2xl font-bold mt-2 ${criticalDiskCount > 0 ? "text-rose-700 animate-pulse" : "text-foreground"}`}>
            {criticalDiskCount}
          </p>
          <span className={`text-[11px] ${criticalDiskCount > 0 ? "text-rose-700 font-semibold" : "text-muted-foreground"}`}>
            {criticalDiskCount > 0 ? "Acil müdahale gerekli!" : "Tüm diskler normal"}
          </span>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <form method="get" action="/inventory" className="flex flex-wrap items-center gap-2 rounded-xl border bg-card p-2.5 shadow-xs">
        <div className="flex min-w-56 flex-1 items-center gap-2 rounded-lg border bg-background px-3">
          <HiOutlineMagnifyingGlass className="size-4 shrink-0 text-muted-foreground" />
          <input
            name="q"
            defaultValue={q}
            placeholder="Cihaz adı, IP adresi, kullanıcı veya departman ara..."
            className="h-9 w-full bg-transparent text-sm outline-none"
          />
        </div>

        <select
          name="dept"
          defaultValue={deptFilter}
          className="h-9 rounded-lg border border-input bg-background px-3 text-sm outline-none text-foreground"
        >
          <option value="">Tüm Departmanlar</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>

        <button
          type="submit"
          className="h-9 px-4 rounded-lg bg-primary text-primary-foreground font-semibold text-xs hover:bg-primary/90 transition-colors cursor-pointer"
        >
          Filtrele
        </button>

        {(q || deptFilter) && (
          <Link
            href="/inventory"
            className="h-9 px-3 rounded-lg border bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground text-xs font-medium inline-flex items-center gap-1 transition-colors"
          >
            <HiOutlineXMark className="size-3.5" />
            Temizle
          </Link>
        )}
      </form>

      {/* Table */}
      <div className="rounded-xl border bg-card overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-muted/50 text-muted-foreground border-b text-[11px] uppercase font-semibold">
              <tr>
                <th className="px-4 py-3">Bilgisayar & Durum</th>
                <th className="px-4 py-3">Yerel IP & Ağ</th>
                <th className="px-4 py-3">Sistem & Donanım (Disk / RAM)</th>
                <th className="px-4 py-3">Departman</th>
                <th className="px-4 py-3">Zimmetli Personel</th>
                <th className="px-4 py-3">Windows Kullanıcısı / Son Görülme</th>
                <th className="px-4 py-3 text-right">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredComputers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-muted-foreground">
                    {q || deptFilter ? (
                      <div className="space-y-2">
                        <p className="text-sm">Aramanıza uygun cihaz bulunamadı.</p>
                        <Link href="/inventory" className="text-xs text-primary hover:underline font-semibold">
                          Filtreleri Temizle
                        </Link>
                      </div>
                    ) : (
                      "Henüz kayıtlı cihaz bulunmuyor. 'Yeni Cihaz Ekle' butonunu kullanarak ilk bilgisayarı kaydedebilirsiniz."
                    )}
                  </td>
                </tr>
              ) : (
                filteredComputers.map((c) => {
                  const ipMatch = c.notes?.match(/IP:\s*([^\s|]+)/)?.[1];
                  const winUser = c.notes?.match(/Windows:\s*([^\s|]+)/)?.[1];
                  const osMatch = c.notes?.match(/OS:\s*([^|]+)/)?.[1]?.trim();

                  const cpuMatch = c.cpuModel || c.notes?.match(/CPU:\s*([^|]+)/)?.[1]?.trim();
                  const gpuMatch = c.notes?.match(/GPU:\s*([^|]+)/)?.[1]?.trim();
                  const netMatch = c.notes?.match(/Ağ:\s*([^|]+)/)?.[1]?.trim();
                  const screenMatch = c.notes?.match(/Ekran:\s*([^|]+)/)?.[1]?.trim();

                  const ramMatch = c.totalRam || c.notes?.match(/RAM:\s*([^|]+)/)?.[1]?.trim();
                  const diskMatch = c.freeDiskSpace || c.notes?.match(/Disk:\s*([^|]+)/)?.[1]?.trim();

                  const uptimeMatch = c.notes?.match(/Uptime:\s*([^|]+)/)?.[1]?.trim();
                  const lastSeen = c.notes?.match(/Son Görülme:\s*([^|]+)/)?.[1]?.trim();
                  const heartbeatIso = c.notes?.match(/Heartbeat:\s*([^|]+)/)?.[1]?.trim();

                  let isOnline = false;
                  if (heartbeatIso) {
                    const diff = now - new Date(heartbeatIso).getTime();
                    isOnline = !isNaN(diff) && diff < 180000;
                  } else if (c.updatedAt) {
                    const diff = now - new Date(c.updatedAt).getTime();
                    isOnline = !isNaN(diff) && diff < 180000;
                  }

                  let isDiskCritical = false;
                  if (diskMatch) {
                    const freeNum = parseFloat(diskMatch.split("GB")[0]);
                    if (!isNaN(freeNum) && freeNum < 15) {
                      isDiskCritical = true;
                    }
                  }

                  const extraNotes = c.notes
                    ?.replace(/IP:[^|]+\|?/g, "")
                    .replace(/Windows:[^|]+\|?/g, "")
                    .replace(/OS:[^|]+\|?/g, "")
                    .replace(/CPU:[^|]+\|?/g, "")
                    .replace(/GPU:[^|]+\|?/g, "")
                    .replace(/Ağ:[^|]+\|?/g, "")
                    .replace(/Ekran:[^|]+\|?/g, "")
                    .replace(/RAM:[^|]+\|?/g, "")
                    .replace(/Disk:[^|]+\|?/g, "")
                    .replace(/Uptime:[^|]+\|?/g, "")
                    .replace(/Son Görülme:[^|]+\|?/g, "")
                    .replace(/Heartbeat:[^|]+\|?/g, "")
                    .replace(/Boşta:[^|]+\|?/g, "")
                    .trim();

                  return (
                    <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                      {/* Bilgisayar Adı & Durum */}
                      <td className="px-4 py-3 font-semibold text-foreground">
                        <div className="flex items-center gap-2.5">
                          <div className={`size-8 rounded-lg flex items-center justify-center shrink-0 ${isOnline ? "bg-emerald-50 text-emerald-600 border border-emerald-200" : "bg-muted text-muted-foreground"}`}>
                            <HiOutlineComputerDesktop className="size-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-sm">{c.name}</span>
                              {isOnline ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                  Çevrimiçi
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground">
                                  Çevrimdışı
                                </span>
                              )}
                            </div>
                            {osMatch && (
                              <span className="text-[10px] text-muted-foreground block truncate max-w-[210px] mt-0.5 font-medium">
                                {osMatch}
                              </span>
                            )}
                            {screenMatch && screenMatch !== "-" && (
                              <span className="text-[9.5px] text-muted-foreground/80 block font-medium">
                                🖥️ {screenMatch}
                              </span>
                            )}
                            {extraNotes && (
                              <span className="text-[10px] text-muted-foreground/70 block truncate max-w-[180px]">
                                {extraNotes}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Yerel IP & Ağ */}
                      <td className="px-4 py-3">
                        {ipMatch ? (
                          <div className="space-y-1">
                            <CopyIpButton ip={ipMatch} />
                            {netMatch && netMatch !== "-" && (
                              <span className="text-[10px] text-muted-foreground block font-medium">
                                🌐 {netMatch}
                              </span>
                            )}
                            {uptimeMatch && uptimeMatch !== "-" && (
                              <span className="text-[10px] text-muted-foreground block font-mono">
                                ⏱️ {uptimeMatch}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground font-mono">—</span>
                        )}
                      </td>

                      {/* Sistem & Donanım (Disk / RAM / CPU / GPU) */}
                      <td className="px-4 py-3 text-xs">
                        {diskMatch || ramMatch || cpuMatch || gpuMatch ? (
                          <div className="space-y-1 max-w-[280px]">
                            {diskMatch && (
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-[11px] font-medium text-foreground">
                                  💾 {diskMatch}
                                </span>
                                {isDiskCritical && (
                                  <span className="px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-rose-100 text-rose-700 border border-rose-200 animate-pulse">
                                    ⚠️ Az (&lt;15 GB)
                                  </span>
                                )}
                              </div>
                            )}
                            {ramMatch && ramMatch !== "-" && (
                              <span className="text-[10.5px] text-muted-foreground block">
                                🧠 RAM: {ramMatch}
                              </span>
                            )}
                            {cpuMatch && cpuMatch !== "-" && (
                              <span className="text-[10px] text-muted-foreground block truncate" title={cpuMatch}>
                                ⚡ CPU: {cpuMatch}
                              </span>
                            )}
                            {gpuMatch && gpuMatch !== "-" && (
                              <span className="text-[10px] text-muted-foreground/90 block truncate" title={gpuMatch}>
                                🎮 GPU: {gpuMatch}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </td>

                      {/* Departman */}
                      <td className="px-4 py-3">
                        {c.department ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-muted border">
                            <HiOutlineBuildingOffice2 className="size-3.5 text-muted-foreground" />
                            {c.department.name}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </td>

                      {/* Zimmetli Personel */}
                      <td className="px-4 py-3">
                        {c.user ? (
                          <div className="flex items-center gap-2">
                            <div className="size-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold shrink-0">
                              {(c.user.name || c.user.email).charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <span className="block text-xs font-semibold text-foreground truncate">
                                {c.user.name || c.user.email}
                              </span>
                              {c.user.name && (
                                <span className="block text-[10px] text-muted-foreground truncate">
                                  {c.user.email}
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground font-medium bg-muted/60 px-2 py-0.5 rounded">
                            Serbest Cihaz
                          </span>
                        )}
                      </td>

                      {/* Windows Kullanıcısı / Son Görülme */}
                      <td className="px-4 py-3 text-xs">
                        <div className="flex flex-col gap-0.5">
                          {winUser && winUser !== "-" ? (
                            <span className="font-mono font-medium text-foreground text-[11px]">
                              Win: {winUser}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-[11px]">—</span>
                          )}
                          {lastSeen ? (
                            <span className="text-[10px] text-muted-foreground">
                              {lastSeen}
                            </span>
                          ) : null}
                        </div>
                      </td>

                      {/* İşlem */}
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {ipMatch && (
                            <a
                              href={`vnc://${ipMatch}`}
                              title="TightVNC ile Bağlan"
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors"
                            >
                              <HiOutlineBolt className="size-3.5" />
                              VNC
                            </a>
                          )}
                          <SendComputerMessageDialog
                            computer={c}
                            variant="icon"
                          />
                          <RemoteCommandDialog computerName={c.name} />
                          <SystemEventsPanel computerName={c.name} />
                          <QRPrintButton
                            computerName={c.name}
                            computerDepartment={c.department?.name}
                            computerUser={c.user?.name ?? c.user?.email}
                          />
                          <ComputerDialog
                            computer={c}
                            departments={departments}
                            users={users}
                            variant="ghost"
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
