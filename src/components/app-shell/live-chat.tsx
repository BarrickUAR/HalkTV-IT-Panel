"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  HiOutlineArrowLeft,
  HiOutlineChatBubbleLeftEllipsis,
  HiOutlineMagnifyingGlass,
  HiOutlinePaperAirplane,
  HiOutlineXMark,
  HiOutlineTrash,
  HiOutlineCheckCircle,
  HiOutlinePaperClip,
  HiOutlineDocument,
  HiOutlineCheck,
  HiOutlineClock,
  HiOutlineArrowDownTray,
  HiOutlineArchiveBox,
  HiOutlineNoSymbol,
  HiEllipsisVertical,
  HiOutlineCog6Tooth,
} from "react-icons/hi2";
import { toast } from "sonner";

import { cn, playNotificationSound } from "@/lib/utils";
import {
  fetchContacts,
  fetchThread,
  markThreadRead,
  sendMessage,
  deleteMessage,
  unreadMessageCount,
  archiveConversation,
  unarchiveConversation,
  deleteConversation,
  blockUserAction,
  unblockUserAction,
  toggleDirectMessagesAction,
  type Contact,
  type MessageDTO,
} from "@/app/(app)/messages/actions";

import { UserAvatar } from "@/components/app-shell/user-avatar";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

// ─── Types ────────────────────────────────────────────────────────────────────

type PendingAttachment =
  | { kind: "image"; file: File; preview: string }
  | { kind: "file"; file: File };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function LiveChat() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"support" | "chat" | "archived">("support");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [q, setQ] = useState("");
  const [active, setActive] = useState<Contact | null>(null);
  const [thread, setThread] = useState<MessageDTO[]>([]);
  const [text, setText] = useState("");
  const [totalUnread, setTotalUnread] = useState(0);
  const [myDmEnabled, setMyDmEnabled] = useState(true);
  const [pending, startSend] = useTransition();
  const scrollRef = useRef<HTMLDivElement>(null);
  const threadCache = useRef<Record<string, MessageDTO[]>>({});
  const [loadingThread, setLoadingThread] = useState(false);

  // Attachment state
  const [attachment, setAttachment] = useState<PendingAttachment | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem("liveChatOpen");
    if (saved === "true") setOpen(true);
    
    // Custom event to open chat from anywhere
    const handleOpenChat = () => {
      setOpen(true);
      setTimeout(() => document.getElementById("chat-search")?.focus(), 100);
    };
    window.addEventListener("open-live-chat", handleOpenChat);
    return () => window.removeEventListener("open-live-chat", handleOpenChat);
  }, []);

  const toggleOpen = () => {
    setOpen((prev) => {
      const next = !prev;
      localStorage.setItem("liveChatOpen", String(next));
      return next;
    });
  };

  // Okunmamış rozeti
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
      } catch {}
    }
    tick();
    const t = setInterval(tick, 15000); // 15s – hem unread sayısını çeker, hem lastActiveAt günceller
    return () => {
      live = false;
      clearInterval(t);
    };
  }, []);

  // Kişi listesi
  useEffect(() => {
    if (active) return; // Sohbetin içindeysek listeyi yenilemeye gerek yok
    let live = true;
    async function load() {
      try {
        const r = await fetchContacts(q);
        if (!live) return;
        setContacts(r.contacts);
        setTotalUnread(r.totalUnread);
        setMyDmEnabled(r.myDmEnabled ?? true);
      } catch {}
    }
    load(); // Hemen yükle (arkaplanda preload)
    const t = setInterval(load, open ? 5000 : 30000); // Açıksa 5 saniyede bir, kapalıysa 30 saniyede bir güncelle
    return () => {
      live = false;
      clearInterval(t);
    };
  }, [open, active, q]);

  // Sohbet dizisi
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
          // Eger benden degilse ses cal
          if (!lastMsg.fromMe && open) {
            playNotificationSound();
          }
        }
        prevThreadLen.current = rows.length;
        
        // tmp mesajları ezmemek için
        setThread((current) => {
          const tmpMessages = current.filter(m => m.id.startsWith("tmp-"));
          return [...rows, ...tmpMessages];
        });
        threadCache.current[a.id] = rows;
        setLoadingThread(false);
        
        if (open) {
          await markThreadRead(a.id);
          setContacts((prev) =>
            prev.map((c) => (c.id === a.id ? { ...c, unread: 0 } : c))
          );
        }
      } catch {
        setLoadingThread(false);
      }
    };
    
    load(); // Arkaplanda hemen yükle
    const t = setInterval(load, open ? 4000 : 30000);
    return () => {
      live = false;
      clearInterval(t);
    };
  }, [active, open]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [thread, active]);

  // ── File picker ────────────────────────────────────────────────────────────

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input value so same file can be re-selected
    e.target.value = "";

    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setAttachment({ kind: "image", file, preview: ev.target?.result as string });
      };
      reader.readAsDataURL(file);
    } else {
      setAttachment({ kind: "file", file });
    }
  }

  function clearAttachment() {
    setAttachment(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  // ── Send ───────────────────────────────────────────────────────────────────

  function send(customText?: string) {
    const a = active;
    const body = (customText !== undefined ? customText : text).trim();
    const hasAttachment = attachment !== null;
    if (!body && !hasAttachment) return;
    if (!a) return;

    if (customText === undefined) setText("");

    // Mesaj gidince ses
    playNotificationSound();

    const tmpId = `tmp-${Date.now()}`;
    const pendingAttachment = attachment;
    clearAttachment();

    setThread((p) => [
      ...p,
      {
        id: tmpId,
        body,
        fromMe: true,
        createdAt: new Date().toISOString(),
        // Optimistic preview
        attachmentUrl: pendingAttachment?.kind === "image" ? pendingAttachment.preview : undefined,
        attachmentName: pendingAttachment?.file.name,
        attachmentType: pendingAttachment?.kind,
        isRead: false,
      },
    ]);

    startSend(async () => {
      let uploadedUrl: string | undefined;
      let uploadedName: string | undefined;
      let uploadedType: string | undefined;

      if (pendingAttachment) {
        try {
          const fd = new FormData();
          fd.append("file", pendingAttachment.file);
          fd.append("subfolder", "messages");
          const resp = await fetch("/api/upload", { method: "POST", body: fd });
          if (resp.ok) {
            const json = (await resp.json()) as { url?: string };
            uploadedUrl = json.url;
            uploadedName = pendingAttachment.file.name;
            uploadedType = pendingAttachment.kind;
          } else {
            toast.error("Dosya yüklenemedi.");
          }
        } catch {
          toast.error("Dosya yüklenemedi.");
        }
      }

      const res = await sendMessage(a.id, body, uploadedUrl, uploadedName, uploadedType);
      if (res.ok && res.message) {
        setThread((p) => p.map(m => m.id === tmpId ? res.message! : m));
      } else {
        toast.error(res.error || "Gönderilemedi.");
        try {
          const rows = await fetchThread(a.id);
          setThread(rows);
        } catch {}
      }
    });
  }

  function handleDelete(msgId: string) {
    if (msgId.startsWith("tmp-")) return;
    
    setThread(p => p.filter(m => m.id !== msgId));
    startSend(async () => {
      const r = await deleteMessage(msgId);
      if (!r.ok) toast.error("Mesaj silinemedi.");
    });
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const canSend = (text.trim().length > 0 || attachment !== null) && !pending;

  return (
    <>
      <button
        type="button"
        onClick={toggleOpen}
        aria-label="Mesajlar"
        className="fixed right-6 bottom-6 z-50 flex size-14 items-center justify-center rounded-full bg-primary text-white shadow-md transition-all hover:scale-105 hover:shadow-lg"
      >
        {open ? (
          <HiOutlineXMark className="size-6 transition-transform duration-300" />
        ) : (
          <HiOutlineChatBubbleLeftEllipsis className="size-6 transition-transform duration-300" />
        )}
        {!open && totalUnread > 0 ? (
          <span className="absolute -top-1 -right-1 flex h-6 min-w-6 items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-bold text-white shadow-sm ring-2 ring-background animate-pulse">
            {totalUnread > 9 ? "9+" : totalUnread}
          </span>
        ) : null}
      </button>

      <div 
        className={cn(
          "fixed right-6 bottom-24 z-50 flex h-[580px] max-h-[calc(100dvh-8rem)] w-[400px] max-w-[calc(100vw-3rem)] flex-col overflow-hidden rounded-2xl border border-border/60 bg-card shadow-2xl transition-all duration-300 origin-bottom-right",
          open ? "scale-100 opacity-100 translate-y-0" : "scale-95 opacity-0 translate-y-4 pointer-events-none"
        )}
      >
        <div className="flex items-center gap-3 border-b border-border bg-gradient-to-r from-primary/90 to-primary/70 px-5 py-4 text-white shadow-sm">
          {active ? (
            <button
              type="button"
              onClick={() => setActive(null)}
              aria-label="Geri"
              className="-ml-2 rounded-full p-2 transition-colors hover:bg-white/20"
            >
              <HiOutlineArrowLeft className="size-5" />
            </button>
          ) : null}
          
          {active ? (
            <div className="relative">
              <UserAvatar role={active.role} image={active.image} name={active.name} className="size-11 shadow-inner border border-white/20" />
              {active.isOnline && (
                <span className="absolute bottom-0 right-0 block h-3 w-3 rounded-full bg-emerald-400 ring-2 ring-primary/80" title="Aktif" />
              )}
            </div>
          ) : (
            <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white/20 text-sm font-bold shadow-inner">
              <HiOutlineChatBubbleLeftEllipsis className="size-6" />
            </div>
          )}
          
          <div className="flex-1 min-w-0">
            <p className="truncate text-base font-bold tracking-tight">
              {active ? active.name : "Canlı Destek"}
            </p>
            <p className="truncate text-xs font-medium text-white/80 mt-0.5">
              {active 
                ? (active.department ? `${active.sub} • ${active.department}` : active.sub) 
                : "HalkTV IT İletişim"}
            </p>
          </div>

          {!active ? (
            <div className="ml-auto flex items-center gap-1">
              <DropdownMenu>
                <DropdownMenuTrigger
                  title="Mesajlaşma Ayarları"
                  className="rounded-full p-2 transition-colors hover:bg-white/20 text-white/90 hover:text-white cursor-pointer"
                >
                  <HiOutlineCog6Tooth className="size-5" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64 p-3 shadow-xl">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-bold text-foreground">Özel Mesaj (DM) Alımı</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {myDmEnabled ? "Diğer personel size mesaj atabilir." : "Mesaj alımınız kapalı."}
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => {
                        const next = !myDmEnabled;
                        startSend(async () => {
                          const res = await toggleDirectMessagesAction(next);
                          if (res.ok) {
                            setMyDmEnabled(next);
                            toast.success(next ? "Mesaj alımı açıldı." : "Mesaj alımı kapatıldı.");
                          } else {
                            toast.error("Ayar güncellenemedi.");
                          }
                        });
                      }}
                      className={cn(
                        "rounded-full px-2.5 py-1 text-xs font-bold transition-all shadow-xs shrink-0 cursor-pointer",
                        myDmEnabled
                          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/30"
                          : "bg-amber-500/15 text-amber-600 dark:text-amber-400 hover:bg-amber-500/25 border border-amber-500/30"
                      )}
                    >
                      {myDmEnabled ? "Açık" : "Kapalı"}
                    </button>
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>

              <button
                type="button"
                onClick={toggleOpen}
                title="Kapat"
                className="rounded-full p-2 transition-colors hover:bg-white/20 text-white/90 hover:text-white"
              >
                <HiOutlineXMark className="size-5" />
              </button>
            </div>
          ) : (
            <div className="ml-auto flex items-center gap-1">
              <DropdownMenu>
                <DropdownMenuTrigger
                  title="Seçenekler"
                  className="rounded-full p-2 transition-colors hover:bg-white/20 text-white/90 hover:text-white cursor-pointer"
                >
                  <HiEllipsisVertical className="size-5" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52 shadow-xl">
                  {thread.length > 0 && (
                    <DropdownMenuItem
                      onClick={() => {
                        if (confirm("Bu görüşmeyi sonlandırmak istiyor musunuz? Karşı tarafa bilgi mesajı gidecektir.")) {
                          const msg = "✅ Bu sohbet sonlandırıldı. Başka bir sorununuz olursa tekrar yazabilirsiniz.";
                          send(msg);
                        }
                      }}
                      className="cursor-pointer"
                    >
                      <HiOutlineCheckCircle className="size-4 text-emerald-500 mr-2" />
                      <span>Sohbeti Bitir</span>
                    </DropdownMenuItem>
                  )}

                  <DropdownMenuItem
                    onClick={() => {
                      const isArchived = active.isArchived;
                      startSend(async () => {
                        const ok = isArchived 
                          ? await unarchiveConversation(active.id) 
                          : await archiveConversation(active.id);
                        if (ok.ok) {
                          toast.success(isArchived ? "Sohbet arşivden çıkarıldı." : "Sohbet arşivlendi.");
                          const r = await fetchContacts(q);
                          setContacts(r.contacts);
                          setActive((prev) => prev ? { ...prev, isArchived: !isArchived } : null);
                        }
                      });
                    }}
                    className="cursor-pointer"
                  >
                    <HiOutlineArchiveBox className="size-4 mr-2 text-muted-foreground" />
                    <span>{active.isArchived ? "Arşivden Çıkar" : "Arşive Taşı"}</span>
                  </DropdownMenuItem>

                  <DropdownMenuItem
                    onClick={() => {
                      if (confirm("Bu kişiyle olan tüm konuşma geçmişini (senin ekranından) silmek istediğine emin misin?")) {
                        setThread([]);
                        if (threadCache.current[active.id]) delete threadCache.current[active.id];
                        startSend(async () => {
                          const ok = await deleteConversation(active.id);
                          if (ok.ok) {
                            const r = await fetchContacts(q);
                            setContacts(r.contacts);
                          }
                        });
                      }
                    }}
                    className="cursor-pointer text-destructive focus:text-destructive"
                  >
                    <HiOutlineTrash className="size-4 mr-2" />
                    <span>Tüm Sohbeti Temizle</span>
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />

                  <DropdownMenuItem
                    onClick={() => {
                      const isBlocked = active.isBlocked;
                      if (!isBlocked && !confirm("Bu kişiyi engellemek istediğinize emin misiniz? Size mesaj gönderemeyecek.")) return;
                      
                      startSend(async () => {
                        const ok = isBlocked 
                          ? await unblockUserAction(active.id)
                          : await blockUserAction(active.id);
                        
                        if (ok.ok) {
                          toast.success(isBlocked ? "Engel kaldırıldı." : "Kullanıcı engellendi.");
                          const r = await fetchContacts(q);
                          setContacts(r.contacts);
                          setActive((prev) => prev ? { ...prev, isBlocked: !isBlocked } : null);
                        }
                      });
                    }}
                    className={cn(
                      "cursor-pointer",
                      active.isBlocked ? "text-emerald-600 focus:text-emerald-600" : "text-destructive focus:text-destructive"
                    )}
                  >
                    <HiOutlineNoSymbol className="size-4 mr-2" />
                    <span>{active.isBlocked ? "Engeli Kaldır" : "Kişiyi Engelle"}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <button
                type="button"
                onClick={toggleOpen}
                title="Kapat"
                className="rounded-full p-2 transition-colors hover:bg-white/20 text-white/90 hover:text-white"
              >
                <HiOutlineXMark className="size-5" />
              </button>
            </div>
          )}
        </div>

        {!active ? (
          <>
            <div className="border-b bg-muted/30 flex flex-col">
              <div className="flex px-3 pt-3 gap-2">
                <button
                  onClick={() => setTab("support")}
                  className={cn(
                    "flex-1 pb-2 text-sm font-semibold transition-colors border-b-2",
                    tab === "support" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  Destek (IT)
                </button>
                <button
                  onClick={() => setTab("chat")}
                  className={cn(
                    "flex-1 pb-2 text-sm font-semibold transition-colors border-b-2",
                    tab === "chat" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  Sohbet
                </button>
                <button
                  onClick={() => setTab("archived")}
                  className={cn(
                    "flex-1 pb-2 text-sm font-semibold transition-colors border-b-2",
                    tab === "archived" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                  )}
                >
                  Arşiv
                </button>
              </div>
              <div className="p-3">
                <div className="flex items-center gap-2 rounded-xl border bg-background px-3 shadow-sm focus-within:ring-2 focus-within:ring-primary/50 transition-all">
                  <HiOutlineMagnifyingGlass className="size-4 shrink-0 text-muted-foreground" />
                  <input
                    id="chat-search"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Kişi ara veya yeni sohbet başlat..."
                    className="h-10 w-full bg-transparent text-sm outline-none"
                  />
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {contacts.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground space-y-3">
                  <HiOutlineMagnifyingGlass className="size-10 opacity-20" />
                  <p className="text-sm">Kişi bulunamadı.</p>
                </div>
              ) : (
                (() => {
                  const itRoles = ["SUPER_ADMIN", "TEKNIK_MUDUR", "TEKNIK_YONETMEN", "IT_AGENT"];
                  const itContacts = contacts.filter(c => !c.isArchived && itRoles.includes(c.role || "") && !c.isMe);
                  const otherContacts = contacts.filter(c => !c.isArchived && !itRoles.includes(c.role || "") && !c.isMe);
                  const archivedContacts = contacts.filter(c => c.isArchived && !c.isMe);
                  
                  const visibleContacts = (tab === "support" ? itContacts : tab === "chat" ? otherContacts : archivedContacts).sort((a, b) => {
                    // 1. Okunmamış olanlar en üstte
                    if (a.unread > 0 && b.unread === 0) return -1;
                    if (b.unread > 0 && a.unread === 0) return 1;
                    
                    // 2. Departmana göre sırala (sadece Sohbet sekmesi için)
                    if (tab === "chat") {
                      const depA = a.department || "ZZZ_NoDepartment";
                      const depB = b.department || "ZZZ_NoDepartment";
                      if (depA !== depB) {
                        return depA.localeCompare(depB, "tr");
                      }
                    } else {
                      // 3. En son mesajlaşılanlar (destek veya arşiv için)
                      if (a.lastMessageAt && !b.lastMessageAt) return -1;
                      if (!a.lastMessageAt && b.lastMessageAt) return 1;
                      if (a.lastMessageAt && b.lastMessageAt) {
                        return new Date(b.lastMessageAt).getTime() - new Date(a.lastMessageAt).getTime();
                      }
                    }
                    
                    // 4. Alfabetik sıralama
                    return a.name.localeCompare(b.name, "tr");
                  });

                  if (visibleContacts.length === 0) {
                     return (
                       <div className="flex flex-col items-center justify-center h-full text-muted-foreground space-y-3 p-6 text-center">
                         <p className="text-sm">Bu sekmede kimse bulunamadı.</p>
                       </div>
                     );
                  }

                  let currentDepartment = "";

                  return (
                    <>
                      {visibleContacts.map((c) => {
                        let showDepartmentHeader = false;
                        if (tab === "chat") {
                          const dep = c.department || "Diğer Departmanlar";
                          if (dep !== currentDepartment) {
                            showDepartmentHeader = true;
                            currentDepartment = dep;
                          }
                        }
                        
                        return (
                          <div key={c.id}>
                            {showDepartmentHeader && (
                              <div className="bg-muted/30 px-4 py-1.5 sticky top-0 z-10 backdrop-blur-md border-y border-border/50">
                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{currentDepartment}</span>
                              </div>
                            )}
                            <button
                              type="button"
                              disabled={c.isMe}
                              onClick={() => {
                                setActive(c);
                                if (threadCache.current[c.id]) {
                                  setThread(threadCache.current[c.id]);
                                  setLoadingThread(false);
                                } else {
                                  setThread([]);
                                  setLoadingThread(true);
                                }
                              }}
                              className={cn(
                            "flex w-full items-center gap-4 border-b px-4 py-3 text-left last:border-b-0 transition-colors group relative",
                            c.isMe ? "opacity-70 cursor-default bg-muted/20" : 
                            c.unread > 0 ? "bg-primary/5 hover:bg-primary/10" : "hover:bg-muted/50"
                          )}
                        >
                          {c.unread > 0 && (
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-r-full" />
                          )}
                          <div className="relative shrink-0">
                            <UserAvatar role={c.role} image={c.image} name={c.name} className="size-12 group-hover:scale-105 transition-transform" />
                            {c.isOnline && (
                              <span className="absolute bottom-0 right-0 block h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-background" title="Aktif" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex justify-between items-baseline mb-0.5">
                              <p className={cn("truncate text-sm", c.unread > 0 ? "font-bold text-foreground" : "font-semibold")}>
                                {c.name} {c.isMe && <span className="text-muted-foreground font-normal">(Sen)</span>}
                              </p>
                              {c.lastMessageAt && (
                                <span className={cn("text-[10px] shrink-0 ml-2", c.unread > 0 ? "font-bold text-primary" : "text-muted-foreground")}>
                                  {new Date(c.lastMessageAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              )}
                            </div>
                            <p className="truncate text-[11px] font-medium text-primary/80 mb-0.5">
                              {c.department ? `${c.sub} • ${c.department}` : c.sub}
                            </p>
                            {c.lastMessage && (
                              <p className="truncate text-xs text-muted-foreground">
                                <span className={c.unread > 0 ? "font-bold text-foreground" : ""}>{c.lastMessage}</span>
                              </p>
                            )}
                            {c.isBlocked && (
                              <p className="text-[10px] font-semibold text-red-500 mt-1 uppercase">Engellendi</p>
                            )}
                            {c.directMessagesEnabled === false && (
                              <p className="text-[10px] font-semibold text-amber-500 mt-1 uppercase">Mesaj Alımı Kapalı</p>
                            )}
                          </div>
                          {c.unread > 0 ? (
                            <div className="relative">
                              <span className="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-20"></span>
                              <span className="relative flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-[11px] font-bold text-white shadow-sm ring-2 ring-background">
                                {c.unread > 9 ? "9+" : c.unread}
                              </span>
                            </div>
                          ) : null}
                        </button>
                      </div>
                    );
                  })}
                </>
                  );
                })()
              )}
            </div>
          </>
        ) : (
          <>
            <div
              ref={scrollRef}
              className="flex-1 space-y-3 overflow-y-auto bg-[url('/bg-chat.png')] bg-muted/10 p-4"
            >
              {loadingThread ? (
                <div className="space-y-4 p-2 animate-pulse">
                  <div className="flex justify-start">
                    <div className="h-10 w-44 rounded-2xl rounded-tl-sm bg-muted-foreground/15" />
                  </div>
                  <div className="flex justify-end">
                    <div className="h-12 w-56 rounded-2xl rounded-tr-sm bg-primary/20" />
                  </div>
                  <div className="flex justify-start">
                    <div className="h-9 w-36 rounded-2xl rounded-tl-sm bg-muted-foreground/15" />
                  </div>
                  <div className="flex justify-end">
                    <div className="h-14 w-48 rounded-2xl rounded-tr-sm bg-primary/20" />
                  </div>
                </div>
              ) : thread.length === 0 ? (
                <div className="mt-10 flex flex-col items-center gap-3 px-6 text-center animate-in fade-in zoom-in duration-300">
                  <UserAvatar role={active?.role} image={active?.image} name={active?.name} className="size-20 text-2xl shadow-sm" />
                  <div>
                    <p className="font-bold text-lg">{active?.name}</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {active?.department ? `${active?.sub} • ${active?.department}` : active?.sub}
                    </p>
                  </div>
                  {active?.isOnline ? (
                    <span className="text-xs text-emerald-500 font-medium">● Şu an aktif</span>
                  ) : (
                    <span className="text-xs text-muted-foreground">● Çevrimdışı</span>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">Henüz mesaj yok. İlk mesajı yazarak sohbeti başlatabilirsiniz.</p>
                </div>
              ) : (
                thread.map((m) => (
                  <div
                    key={m.id}
                    className={cn(
                      "flex animate-in fade-in slide-in-from-bottom-2 duration-300 group",
                      m.fromMe ? "justify-end" : "justify-start",
                    )}
                  >
                    {m.fromMe && !m.id.startsWith("tmp-") && (
                       <button 
                         onClick={() => handleDelete(m.id)}
                         className="mr-2 self-center opacity-0 group-hover:opacity-100 text-destructive/70 hover:text-destructive transition-all hover:scale-110"
                         title="Mesajı Sil"
                       >
                         <HiOutlineTrash className="size-4" />
                       </button>
                    )}
                    <div
                      className={cn(
                        "max-w-[80%] rounded-2xl px-4 py-2 text-[14px] leading-relaxed shadow-sm break-words whitespace-pre-wrap relative",
                        m.fromMe
                          ? "bg-primary text-white rounded-tr-sm"
                          : "bg-white dark:bg-slate-800 border border-border/60 text-foreground rounded-tl-sm",
                        m.id.startsWith("tmp-") && "opacity-70"
                      )}
                    >
                      {/* Mesaj metni */}
                      {m.body && <span>{m.body}</span>}

                      {/* Ek: görsel */}
                      {m.attachmentUrl && m.attachmentType === "image" && (
                        <a
                          href={m.attachmentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-2 block"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={m.attachmentUrl}
                            alt={m.attachmentName ?? "Görsel ek"}
                            className="max-w-[200px] rounded-xl object-cover cursor-pointer hover:opacity-90 transition-opacity"
                          />
                        </a>
                      )}

                      {/* Ek: dosya */}
                      {m.attachmentUrl && m.attachmentType === "file" && (
                        <a
                          href={m.attachmentUrl}
                          download={m.attachmentName || "dosya"}
                          className={cn(
                            "mt-2 flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-xs font-medium transition-colors hover:opacity-80",
                            m.fromMe
                              ? "border-white/30 bg-white/10 text-white"
                              : "border-border bg-muted/40 text-foreground"
                          )}
                          title="İndir"
                        >
                          <div className="flex items-center gap-2 overflow-hidden">
                            <HiOutlineDocument className="size-4 shrink-0" />
                            <span className="truncate max-w-[140px]">{m.attachmentName ?? "Dosya"}</span>
                          </div>
                          <HiOutlineArrowDownTray className="size-4 shrink-0 opacity-70" />
                        </a>
                      )}

                      <div className={cn(
                         "flex items-center gap-1 mt-1 text-[10px]", 
                         m.fromMe ? "justify-end text-white/70" : "justify-start text-muted-foreground"
                      )}>
                         <span>{new Date(m.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                         {m.fromMe && (
                           m.id.startsWith("tmp-") ? (
                             <HiOutlineClock className="size-[14px] opacity-60" />
                           ) : m.isRead ? (
                             <div className="flex -space-x-1.5 text-sky-400">
                               <HiOutlineCheck className="size-[14px]" />
                               <HiOutlineCheck className="size-[14px]" />
                             </div>
                           ) : (
                             <HiOutlineCheck className="size-[14px] opacity-80" />
                           )
                         )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Attachment preview */}
            {attachment && (
              <div className="flex items-center gap-2 border-t bg-muted/20 px-3 py-2">
                {attachment.kind === "image" ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={attachment.preview}
                      alt="Önizleme"
                      className="h-12 w-12 rounded-lg object-cover border border-border shadow-sm"
                    />
                    <span className="flex-1 truncate text-xs text-muted-foreground">
                      {attachment.file.name}
                    </span>
                  </>
                ) : (
                  <>
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-border bg-muted shadow-sm">
                      <HiOutlineDocument className="size-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-xs font-medium">{attachment.file.name}</p>
                      <p className="text-[10px] text-muted-foreground">{formatBytes(attachment.file.size)}</p>
                    </div>
                  </>
                )}
                <button
                  type="button"
                  onClick={clearAttachment}
                  title="Eki kaldır"
                  className="ml-auto rounded-full p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <HiOutlineXMark className="size-4" />
                </button>
              </div>
            )}

            {active?.isBlocked ? (
              <div className="border-t bg-muted p-4 text-center">
                <p className="text-sm font-semibold text-red-500">Bu kullanıcıyı engellediniz.</p>
                <p className="text-xs text-muted-foreground mt-1">Mesaj göndermek için engeli kaldırın.</p>
              </div>
            ) : active?.directMessagesEnabled === false ? (
              <div className="border-t bg-muted p-4 text-center">
                <p className="text-sm font-semibold text-amber-500">Mesaj Alımı Kapalı</p>
                <p className="text-xs text-muted-foreground mt-1">Bu kullanıcı mesaj alımını kapatmış.</p>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  send();
                }}
                className="flex items-center gap-2 border-t bg-background p-3 shadow-inner"
              >
                {/* Gizli dosya input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,.rar"
                  className="hidden"
                  onChange={handleFileChange}
                />

                {/* Dosya ekleme butonu */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  title="Dosya / Görsel ekle"
                  className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-border bg-muted/40 text-muted-foreground transition-all hover:border-primary/50 hover:text-primary hover:bg-primary/5"
                >
                  <HiOutlinePaperClip className="size-5" />
                </button>

                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Mesaj yaz…"
                  className="h-11 flex-1 rounded-xl border bg-muted/40 px-4 text-sm outline-none focus-visible:border-primary/50 focus-visible:bg-background transition-colors"
                />
                <button
                  type="submit"
                  disabled={!canSend}
                  aria-label="Gönder"
                  className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-all hover:brightness-110 hover:scale-105 disabled:opacity-40 disabled:hover:scale-100"
                >
                  <HiOutlinePaperAirplane className="size-5 -mr-1" />
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </>
  );
}
