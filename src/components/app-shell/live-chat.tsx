"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  HiOutlineArrowLeft,
  HiOutlineChatBubbleLeftEllipsis,
  HiOutlineMagnifyingGlass,
  HiOutlinePaperAirplane,
  HiOutlineXMark,
} from "react-icons/hi2";

import { cn, playNotificationSound } from "@/lib/utils";
import {
  fetchContacts,
  fetchThread,
  markThreadRead,
  sendMessage,
  unreadMessageCount,
  type Contact,
  type MessageDTO,
} from "@/app/(app)/messages/actions";

import { UserAvatar } from "@/components/app-shell/user-avatar";

function initials(name: string): string {
  const p = name.trim().split(/\s+/);
  return ((p[0]?.[0] ?? "") + (p[1]?.[0] ?? "")).toUpperCase() || "?";
}

export function LiveChat() {
  const [open, setOpen] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [q, setQ] = useState("");
  const [active, setActive] = useState<Contact | null>(null);
  const [thread, setThread] = useState<MessageDTO[]>([]);
  const [text, setText] = useState("");
  const [totalUnread, setTotalUnread] = useState(0);
  const [, startSend] = useTransition();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Okunmamış rozeti — her zaman arka planda.
  const prevTotal = useRef(totalUnread);

  useEffect(() => {
    if (totalUnread > prevTotal.current) {
      playNotificationSound();
    }
    prevTotal.current = totalUnread;
  }, [totalUnread]);

  useEffect(() => {
    let live = true;
    async function tick() {
      try {
        const n = await unreadMessageCount();
        if (live) setTotalUnread(n);
      } catch {
        // sessiz
      }
    }
    tick();
    const t = setInterval(tick, 20000);
    return () => {
      live = false;
      clearInterval(t);
    };
  }, []);

  // Kişi listesi — panel açık ve sohbet seçili değilken.
  useEffect(() => {
    if (!open || active) return;
    let live = true;
    async function load() {
      try {
        const r = await fetchContacts(q);
        if (!live) return;
        setContacts(r.contacts);
        setTotalUnread(r.totalUnread);
      } catch {
        // sessiz
      }
    }
    load();
    const t = setInterval(load, 12000);
    return () => {
      live = false;
      clearInterval(t);
    };
  }, [open, active, q]);

  // Sohbet dizisi — bir kişi seçiliyken.
  const prevThreadLen = useRef(0);
  
  useEffect(() => {
    const a = active;
    if (!a) return;
    let live = true;
    prevThreadLen.current = thread.length;
    
    const load = async () => {
      try {
        const rows = await fetchThread(a.id);
        if (!live) return;
        
        if (rows.length > prevThreadLen.current) {
          const lastMsg = rows[rows.length - 1];
          if (!lastMsg.fromMe) playNotificationSound();
        }
        prevThreadLen.current = rows.length;
        
        setThread(rows);
        await markThreadRead(a.id);
        if (live) {
          setContacts((prev) =>
            prev.map((c) => (c.id === a.id ? { ...c, unread: 0 } : c)),
          );
        }
      } catch {
        // sessiz
      }
    };
    load();
    const t = setInterval(load, 4000);
    return () => {
      live = false;
      clearInterval(t);
    };
  }, [active]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [thread, active]);

  function send() {
    const a = active;
    const body = text.trim();
    if (!body || !a) return;
    setText("");
    setThread((p) => [
      ...p,
      {
        id: `tmp-${p.length}-${body.length}`,
        body,
        fromMe: true,
        createdAt: new Date().toISOString(),
      },
    ]);
    startSend(async () => {
      await sendMessage(a.id, body);
      try {
        setThread(await fetchThread(a.id));
      } catch {
        // sessiz
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Mesajlar"
        className="fixed right-6 bottom-6 z-50 flex size-14 items-center justify-center rounded-full bg-primary text-white shadow-md transition-all hover:scale-105 hover:shadow-lg"
      >
        {open ? (
          <HiOutlineXMark className="size-6 transition-transform duration-300" />
        ) : (
          <HiOutlineChatBubbleLeftEllipsis className="size-6 transition-transform duration-300" />
        )}
        {!open && totalUnread > 0 ? (
          <span className="absolute -top-1 -right-1 flex h-6 min-w-6 items-center justify-center rounded-full bg-slate-900 px-1.5 text-xs font-bold text-white shadow-sm ring-2 ring-background">
            {totalUnread > 9 ? "9+" : totalUnread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="fixed right-6 bottom-24 z-50 flex h-[580px] max-h-[calc(100dvh-8rem)] w-[380px] max-w-[calc(100vw-3rem)] flex-col overflow-hidden rounded-2xl border border-border/60 bg-card shadow-lg animate-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-center gap-3 border-b border-border bg-muted/80 px-5 py-4 text-white">
            {active ? (
              <button
                type="button"
                onClick={() => setActive(null)}
                aria-label="Geri"
                className="-ml-2 rounded-full p-1.5 transition-colors hover:bg-white/15"
              >
                <HiOutlineArrowLeft className="size-5" />
              </button>
            ) : null}
            {active ? (
              <UserAvatar role={active.role} image={active.image} className="size-10 shadow-inner" />
            ) : (
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-sm font-bold shadow-inner">
                <HiOutlineChatBubbleLeftEllipsis className="size-5" />
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate text-base font-semibold tracking-tight">
                {active ? active.name : "Canlı Destek"}
              </p>
              <p className="truncate text-xs font-medium text-white/70">
                {active ? active.sub : "HalkTV Teknik Destek Ekibi"}
              </p>
            </div>
          </div>

          {!active ? (
            <>
              <div className="border-b p-2">
                <div className="flex items-center gap-2 rounded-lg border bg-background px-3">
                  <HiOutlineMagnifyingGlass className="size-4 shrink-0 text-muted-foreground" />
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Kişi ara…"
                    className="h-9 w-full bg-transparent text-sm outline-none"
                  />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                {contacts.length === 0 ? (
                  <p className="p-6 text-center text-sm text-muted-foreground">
                    Kişi bulunamadı.
                  </p>
                ) : (
                  contacts.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setThread([]);
                        setActive(c);
                      }}
                      className="flex w-full items-center gap-3 border-b px-3 py-2.5 text-left last:border-b-0 hover:bg-muted/50"
                    >
                      <UserAvatar role={c.role} image={c.image} className="size-10" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{c.name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {c.sub}
                        </p>
                      </div>
                      {c.unread > 0 ? (
                        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-bold text-white">
                          {c.unread > 9 ? "9+" : c.unread}
                        </span>
                      ) : null}
                    </button>
                  ))
                )}
              </div>
            </>
          ) : (
            <>
              <div
                ref={scrollRef}
                className="flex-1 space-y-2 overflow-y-auto bg-muted/20 p-3"
              >
                {thread.length === 0 ? (
                  <div className="mt-10 flex flex-col items-center gap-3 px-6 text-center">
                    <UserAvatar role={active?.role} image={active?.image} className="size-16 text-xl" />
                    <div>
                      <p className="font-semibold">{active?.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {active?.sub}
                      </p>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Bu kişiyle henüz mesajlaşmadınız. İlk mesajı sen yaz. 👋
                    </p>
                  </div>
                ) : (
                  thread.map((m) => (
                    <div
                      key={m.id}
                      className={cn(
                        "flex animate-in fade-in slide-in-from-bottom-1 duration-200",
                        m.fromMe ? "justify-end" : "justify-start",
                      )}
                    >
                      <div
                        className={cn(
                          "max-w-[85%] rounded-2xl px-4 py-2.5 text-[13.5px] leading-relaxed shadow-sm break-words whitespace-pre-wrap",
                          m.fromMe
                            ? "bg-primary text-white rounded-tr-sm"
                            : "bg-white dark:bg-slate-800 border border-border/50 text-foreground rounded-tl-sm",
                        )}
                      >
                        {m.body}
                      </div>
                    </div>
                  ))
                )}
              </div>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  send();
                }}
                className="flex items-center gap-2 border-t p-2"
              >
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Mesaj yaz…"
                  className="h-10 flex-1 rounded-lg border bg-background px-3 text-sm outline-none focus-visible:border-ring"
                />
                <button
                  type="submit"
                  disabled={!text.trim()}
                  aria-label="Gönder"
                  className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground transition hover:brightness-110 disabled:opacity-40"
                >
                  <HiOutlinePaperAirplane className="size-4" />
                </button>
              </form>
            </>
          )}
        </div>
      ) : null}
    </>
  );
}
