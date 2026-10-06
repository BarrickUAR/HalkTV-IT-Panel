"use client";
import { useState } from "react";
import s from "./admin-logs.module.css";
export type KioskNotification = { id: string; title: string; body: string | null; type: string; isRead: boolean; createdAt: string; link: string | null; entityId?: string | null };
const typeLabels: Record<string, string> = { TICKET_CREATED: "Yeni talep", TICKET_ASSIGNED: "Talep atandı", TICKET_STATUS: "Talep durumu", TICKET_COMMENT: "Talep yanıtı", SLA_WARNING: "Süre uyarısı", APPROVAL_REQUEST: "Onay isteği", ANNOUNCEMENT: "Duyuru", DIRECT_MESSAGE: "Mesaj", DEVICE_MESSAGE: "Cihaz sohbeti" };
export function AdminNotifications({ items, onRead, onDelete, onOpenTicket, onOpenDevice }: { items: KioskNotification[]; onRead: (id?: string) => Promise<void>; onDelete: (id?: string) => Promise<void>; onOpenTicket: (id: string) => void; onOpenDevice: (id: string) => void }) {
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirmClear, setConfirmClear] = useState(false);
  async function read(id?: string) {
    setBusy(true); setError("");
    try { await onRead(id); } catch { setError("Bildirim güncellenemedi. Tekrar deneyin."); } finally { setBusy(false); }
  }
  async function remove(id?: string) {
    setBusy(true); setError("");
    try { await onDelete(id); setConfirmClear(false); } catch { setError("Bildirim silinemedi. Tekrar deneyin."); } finally { setBusy(false); }
  }
  const filtered = items.filter(n => !unreadOnly || !n.isRead);
  return <section className={s.panel}>
    <div className={s.header}><strong>Bildirimler</strong><div style={{display:"flex",gap:5}}><button disabled={busy || !items.some(n => !n.isRead)} onClick={() => void read()}>Tümünü okundu yap</button><button disabled={busy || !items.length} onClick={() => setConfirmClear(true)}>Bildirimleri sil</button></div></div>
    {confirmClear && <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:7,padding:7,borderRadius:7,background:"#fff4e8",color:"#8a4b16",fontSize:9}}><span>Tüm bildirimler silinsin mi?</span><span style={{display:"flex",gap:4}}><button disabled={busy} onClick={() => setConfirmClear(false)}>Vazgeç</button><button disabled={busy} onClick={() => void remove()}>Tümünü sil</button></span></div>}
    <label><input type="checkbox" checked={unreadOnly} onChange={e => setUnreadOnly(e.target.checked)} /> Yalnızca okunmamışlar</label>
    {error && <p role="alert" className={s.error}>{error}</p>}
    <div className={s.list}>{filtered.map(n => <article key={n.id} className={s.card}>
      <div className={s.header}><span className={s.badge} data-tone={n.isRead ? "slate" : "blue"}>{typeLabels[n.type] || "Sistem bildirimi"} · {n.isRead ? "Okundu" : "Yeni"}</span><time>{new Date(n.createdAt).toLocaleString("tr-TR")}</time></div>
      <p><strong>{n.title}</strong></p><p>{n.body}</p>
      <div className={s.header}><span style={{display:"flex",gap:4}}>{!n.isRead && <button disabled={busy} onClick={() => void read(n.id)}>Okundu işaretle</button>}<button disabled={busy} onClick={() => void remove(n.id)}>Sil</button></span>
        {n.link?.startsWith("/tickets/") && <button onClick={() => { if (!n.isRead) void read(n.id); onOpenTicket(n.link!.split("/")[2].split("?")[0]); }}>Talebi aç</button>}{n.type === "DEVICE_MESSAGE" && n.entityId && <button onClick={() => { if (!n.isRead) void read(n.id); onOpenDevice(n.entityId!); }}>Cihaz sohbetini aç</button>}</div>
    </article>)}</div>
    {!filtered.length && <p className={s.note}>Gösterilecek bildirim yok.</p>}
    <small>Son 40 bildirim gösterilir.</small>
  </section>;
}
