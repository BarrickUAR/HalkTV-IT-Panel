"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { HiOutlineArrowLeft, HiOutlinePaperAirplane, HiOutlineComputerDesktop } from "react-icons/hi2";
import styles from "./device-conversation.module.css";

type DeviceChatMessage = { id: string; direction: "ADMIN" | "DEVICE"; body: string; senderName: string; senderTitle: string | null; readAt: string | null; createdAt: string };
type Assignment = { assigneeId: string; name: string | null; title: string | null; status: string; assignedAt: string };

export function DeviceConversation({ computerId, guest, visible = true, canTakeover = false, onClose }: { computerId?: string; guest?: boolean; visible?: boolean; canTakeover?: boolean; onClose?: () => void }) {
  const [messages, setMessages] = useState<DeviceChatMessage[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [viewerId, setViewerId] = useState<string | null>(null);
  const [deviceName, setDeviceName] = useState("");
  const [resolvedComputerId, setResolvedComputerId] = useState(computerId || "");
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const threadRef = useRef<HTMLDivElement>(null);
  const pendingReads = useRef(new Set<string>());
  const initialPageLoaded = useRef(false);
  const preserveScroll = useRef(false);
  const refreshPending = useRef(false);
  const mode = guest ? "DEVICE" : "ADMIN";
  const query = computerId ? `?computerId=${encodeURIComponent(computerId)}` : "";

  const refresh = useCallback(async () => {
    if (refreshPending.current) return;
    refreshPending.current = true;
    try {
      const response = await fetch(`/api/device-chat${query}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Cihaz sohbeti yüklenemedi.");
      setMessages((previous) => {
        const merged = new Map<string, DeviceChatMessage>();
        for (const item of previous) merged.set(item.id, item);
        for (const item of data.messages || []) merged.set(item.id, item);
        return [...merged.values()].sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt) || a.id.localeCompare(b.id));
      });
      if (!initialPageLoaded.current) {
        setHasMore(Boolean(data.hasMore));
        initialPageLoaded.current = true;
      }
      setDeviceName(data.computer?.name || "");
      setResolvedComputerId(data.computer?.id || "");
      setAssignment(data.assignment || null);
      setViewerId(data.viewerId || null);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Bağlantı kurulamadı.");
    } finally {
      refreshPending.current = false;
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    initialPageLoaded.current = false;
    setMessages([]);
    setHasMore(false);
    setAssignment(null);
    setLoading(true);
  }, [query]);

  useEffect(() => {
    const update = () => setPageVisible(document.visibilityState === "visible");
    update();
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);

  useEffect(() => {
    if (!visible || !pageVisible || !threadRef.current) return;
    const observer = new IntersectionObserver((entries) => {
      const ids = entries.filter((entry) => entry.isIntersecting && entry.intersectionRect.height >= Math.min(24, entry.boundingClientRect.height))
        .map((entry) => (entry.target as HTMLElement).dataset.messageId).filter((id): id is string => Boolean(id) && !pendingReads.current.has(id!));
      if (!ids.length) return;
      for (const id of ids) pendingReads.current.add(id);
      void fetch("/api/device-chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ computerId, action: "read", messageIds: ids }) })
        .then((response) => {
          if (!response.ok) throw new Error("Okundu bilgisi kaydedilemedi.");
          setMessages((previous) => previous.map((item) => ids.includes(item.id) ? { ...item, readAt: new Date().toISOString() } : item));
          window.dispatchEvent(new Event("kiosk-device-chat-refresh"));
          if (!guest) window.dispatchEvent(new Event("kiosk-session-refresh"));
        }).catch(() => {}).finally(() => { for (const id of ids) pendingReads.current.delete(id); });
    }, { root: threadRef.current, threshold: [0, 0.01, 0.1, 0.5, 1] });
    for (const node of threadRef.current.querySelectorAll<HTMLElement>("[data-message-id]")) observer.observe(node);
    return () => observer.disconnect();
  }, [computerId, guest, messages, mode, pageVisible, visible]);

  useEffect(() => {
    window.dispatchEvent(new CustomEvent("kiosk-device-conversation-state", { detail: { id: visible && pageVisible ? resolvedComputerId : null } }));
    return () => { window.dispatchEvent(new CustomEvent("kiosk-device-conversation-state", { detail: { id: null } })); };
  }, [resolvedComputerId, visible, pageVisible]);

  useEffect(() => {
    if (!visible || !pageVisible) return;
    void refresh();
    const interval = setInterval(() => void refresh(), 8000);
    const event = () => void refresh();
    window.addEventListener("kiosk-device-chat-refresh", event);
    return () => { clearInterval(interval); window.removeEventListener("kiosk-device-chat-refresh", event); };
  }, [refresh, visible, pageVisible]);

  useEffect(() => {
    if (preserveScroll.current) { preserveScroll.current = false; return; }
    bottomRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [messages.length]);

  async function loadOlder() {
    if (!hasMore || !messages.length || loadingOlder) return;
    setLoadingOlder(true);
    const thread = threadRef.current;
    const oldHeight = thread?.scrollHeight || 0;
    try {
      const response = await fetch(`/api/device-chat${query ? `${query}&` : "?"}before=${encodeURIComponent(messages[0].id)}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Eski mesajlar yüklenemedi.");
      preserveScroll.current = true;
      setMessages((previous) => {
        const merged = new Map<string, DeviceChatMessage>();
        for (const item of [...(data.messages || []), ...previous]) merged.set(item.id, item);
        return [...merged.values()].sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt) || a.id.localeCompare(b.id));
      });
      setHasMore(Boolean(data.hasMore));
      requestAnimationFrame(() => { if (thread) thread.scrollTop += thread.scrollHeight - oldHeight; });
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Eski mesajlar yüklenemedi."); }
    finally { setLoadingOlder(false); }
  }

  async function changeAssignment(action: "claim" | "release" | "takeover") {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/device-chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ computerId, action }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Sohbet ataması değiştirilemedi.");
      await refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Sohbet ataması değiştirilemedi."); }
    finally { setBusy(false); }
  }

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const message = draft.trim();
    if (!message || busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/device-chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ computerId, message }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Mesaj gönderilemedi.");
      setDraft("");
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Mesaj gönderilemedi.");
    } finally { setBusy(false); }
  }

  return <section className={styles.root} aria-label="Cihaz sohbeti">
    <header className={styles.header}>
      {onClose && <button type="button" className={styles.back} onClick={onClose} aria-label="Sohbeti kapat"><HiOutlineArrowLeft /></button>}
      <span className={styles.icon}><HiOutlineComputerDesktop /></span>
      <span className={styles.heading}><strong>{guest ? "Teknik destek" : deviceName || "Cihaz sohbeti"}</strong><small>{guest ? `${deviceName || "Bu bilgisayar"} üzerinden iletişim` : "Bu bilgisayardaki kişi · giriş yapmamış olabilir"}</small></span>
    </header>
    <div className={styles.notice}>{guest ? "Hesap girişi yapmadan yazabilirsiniz. Mesajınız bu bilgisayara bağlanır; kişisel hesabınıza değil." : "Karşı tarafın kimliği doğrulanmamış olabilir. Mesajlar cihaza gönderilir ve giriş olmasa da görünür."}</div>
    <div className={styles.assignment}>
      <span>{assignment ? `Sorumlu: ${assignment.name || "Teknik ekip"}${assignment.title ? ` · ${assignment.title}` : ""}` : "Henüz bir yönetici üstlenmedi · teknik ekibe bildirilecek"}</span>
      {!guest && <span className={styles.assignmentActions}>
        {!assignment && <button type="button" disabled={busy} onClick={() => void changeAssignment("claim")}>Sohbeti üstlen</button>}
        {assignment?.assigneeId === viewerId && <button type="button" disabled={busy} onClick={() => void changeAssignment("release")}>Sohbeti bırak</button>}
        {assignment && assignment.assigneeId !== viewerId && canTakeover && <button type="button" disabled={busy} onClick={() => void changeAssignment("takeover")}>Devral</button>}
        {assignment && assignment.assigneeId !== viewerId && !canTakeover && <button type="button" disabled={busy} onClick={() => void changeAssignment("claim")}>Müsait değilse üstlen</button>}
      </span>}
    </div>
    <div ref={threadRef} className={styles.thread} role="log" aria-live="polite">
      {hasMore && <button type="button" className={styles.older} disabled={loadingOlder} onClick={() => void loadOlder()}>{loadingOlder ? "Yükleniyor…" : "Önceki mesajları göster"}</button>}
      {loading && <p className={styles.empty}>Sohbet yükleniyor…</p>}
      {!loading && !messages.length && <p className={styles.empty}>Henüz mesaj yok. İlk mesajı gönderin.</p>}
      {messages.map((item) => <article key={item.id} data-message-id={item.direction !== mode && !item.readAt ? item.id : undefined} className={`${styles.bubble} ${item.direction === mode ? styles.mine : styles.theirs}`}>
        <span className={styles.sender}>{item.senderName}{item.senderTitle ? ` · ${item.senderTitle}` : ""}</span>
        <p>{item.body}</p>
        <span className={styles.time}>{new Date(item.createdAt).toLocaleString("tr-TR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}{item.direction === mode && <span> · {item.readAt ? "Görüldü" : "Gönderildi"}</span>}</span>
      </article>)}
      <div ref={bottomRef} />
    </div>
    <form className={styles.composer} onSubmit={send}>
      <input aria-label="Cihaz sohbeti mesajı" placeholder={guest ? "Teknik desteğe yazın…" : "Bu bilgisayara mesaj yazın…"} value={draft} onChange={(event) => setDraft(event.target.value)} maxLength={2000} />
      <button type="submit" disabled={busy || !draft.trim() || (!guest && Boolean(assignment && assignment.assigneeId !== viewerId))} aria-label="Mesajı gönder"><HiOutlinePaperAirplane /></button>
    </form>
    {error && <p className={styles.error} role="alert">{error}</p>}
  </section>;
}
