"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import s from "./admin-logs.module.css";

type Log = { id: string; label: string; tone: string; entityLabel: string; entityId: string; actorName: string; actorTitle: string | null; actorRole: string; department: string | null; computerName: string | null; assignedComputer: string | null; currentDeviceIp: string | null; ip: string | null; windowsUser: string | null; createdAt: string; targetName: string | null; roleChange: string | null };

export function AdminLogs() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [cursor, setCursor] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [updated, setUpdated] = useState("");
  const request = useRef<AbortController | null>(null);
  const load = useCallback(async (after?: string) => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setBusy(true);
    setError("");
    try {
      const params = new URLSearchParams({ q: query, category });
      if (after) params.set("cursor", after);
      const response = await fetch(`/api/kiosk-logs?${params}`, { cache: "no-store", signal: controller.signal });
      if (!response.ok) throw new Error(response.status === 403 || response.status === 401 ? "Logları görmek için yönetici oturumu gerekli." : "İşlem kayıtları alınamadı.");
      const data = await response.json();
      setLogs(previous => after ? [...previous, ...data.logs.filter((l: Log) => !previous.some(p => p.id === l.id))] : data.logs);
      setCursor(data.nextCursor);
      setUpdated(new Date().toLocaleTimeString("tr-TR"));
    } catch (e) {
      if (!controller.signal.aborted) setError(e instanceof Error ? e.message : "Bağlantı kurulamadı.");
    } finally { if (!controller.signal.aborted) setBusy(false); }
  }, [query, category]);
  useEffect(() => {
    setLogs([]);
    setCursor(null);
    const timer = setTimeout(() => void load(), 300);
    return () => { clearTimeout(timer); request.current?.abort(); };
  }, [load]);
  return <section className={s.panel} aria-busy={busy}>
    <div className={s.header}><strong>İşlem kayıtları</strong><button onClick={() => load()} disabled={busy}>{busy ? "Yükleniyor…" : "Yenile"}</button></div>
    <div className={s.filters}>
      <input aria-label="Loglarda ara" value={query} onChange={e => setQuery(e.target.value)} placeholder="Kullanıcı, bilgisayar veya IP ara" />
      <select aria-label="İşlem kategorisi" value={category} onChange={e => setCategory(e.target.value)}>
        <option value="">Tüm işlemler</option><option value="User">Kullanıcı / oturum</option><option value="Ticket">Talepler</option><option value="Computer">Bilgisayarlar</option><option value="DirectMessage">Mesajlar</option><option value="DeviceCommand">Cihaz komutları</option><option value="Department">Departmanlar</option><option value="Announcement">Duyurular</option>
      </select>
    </div>
    <small>{logs.length} kayıt{updated && ` · Son yenileme ${updated}`}</small>
    {error && <p role="alert" className={s.error}>{error}</p>}
    <div className={s.list}>
      {logs.map(log => <details key={log.id} className={s.card}>
        <summary><div className={s.header}><span className={s.badge} data-tone={log.tone}>{log.label}</span><time>{new Date(log.createdAt).toLocaleString("tr-TR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" })}</time></div>
          <strong>{log.actorName}</strong><small>{[log.actorTitle || log.actorRole, log.department].filter(Boolean).join(" · ")}</small>
          <span className={s.device}>{log.computerName || "Olay cihazı kaydedilmemiş"} · {log.ip || "IP kaydedilmemiş"}</span>
          {log.roleChange && <span className={s.change}>{log.roleChange}</span>}
        </summary>
        <dl>{Object.entries({ "İşlem alanı": log.entityLabel, "İlgili kayıt": log.targetName || log.entityId, "Olay zamanı": new Date(log.createdAt).toLocaleString("tr-TR"), "Olaydaki bilgisayar": log.computerName, "Kaydedilen IP": log.ip, "Windows kullanıcısı": log.windowsUser, "Güncel atanmış cihaz": log.assignedComputer, "Güncel cihaz IP'si": log.currentDeviceIp }).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || "Kaydedilmemiş"}</dd></div>)}</dl>
        <p className={s.note}>Güncel cihaz bilgileri olay anındaki cihazı doğrulamaz.</p>
      </details>)}
      {!logs.length && !busy && !error && <p className={s.note}>Bu filtreye uygun işlem bulunamadı.</p>}
      {cursor && <button className={s.more} disabled={busy} onClick={() => load(cursor)}>Daha eski kayıtları yükle</button>}
    </div>
  </section>;
}
