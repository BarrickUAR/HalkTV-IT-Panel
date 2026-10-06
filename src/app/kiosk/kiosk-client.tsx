"use client";

import React, { useState, useEffect, useRef, useCallback, Suspense, useMemo } from "react";
import { EmployeeHome, ChatWorkspace, WorkspaceNav, DeviceDirectory, type Person, type Device } from "./workspace-views";
import { signIn } from "next-auth/react";
import { AdminLogin } from "@/components/admin-login";
import { AdminLogs } from "./admin-logs";
import { AdminNotifications, type KioskNotification } from "./admin-notifications";
import { DeviceConversation } from "./device-conversation";
import { STATUS_LABELS } from "@/lib/ticket-labels";
import workspaceStyles from "./workspace.module.css";
import { useSearchParams } from "next/navigation";
import {
  HiOutlineWrenchScrewdriver,
  HiOutlineChatBubbleLeftRight,
  HiOutlineComputerDesktop,
  HiOutlineTicket,
  HiPaperAirplane,
  HiMinus,
  HiOutlineBell,
  HiOutlineBellSlash,
  HiOutlineArrowLeft,
  HiOutlineArrowRightOnRectangle,
  HiOutlineXMark,
  HiOutlineFolder,
  HiOutlineCheck,
  HiOutlineMagnifyingGlass,
  HiOutlineGlobeAlt,
  HiOutlineArrowPath,
  HiOutlineUserGroup,
  HiOutlineClipboardDocument,
  HiOutlineChevronDown,
  HiOutlineChevronRight,
  HiOutlineCheckBadge,
  HiOutlinePaperClip,
} from "react-icons/hi2";

interface KioskUser {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
  image: string | null;
  title?: string | null;
  directMessagesEnabled?: boolean;
  department?: { name: string; floor?: string | null } | null;
}

interface ChatMessage {
  id: string;
  body: string;
  fromMe: boolean;
  createdAt: string;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
  attachmentType?: string | null;
  isRead?: boolean;
}

interface ChatPartner {
  id: string;
  name: string | null;
  email?: string | null;
  image: string | null;
  role: string;
  title?: string | null;
  department?: string | null;
  floor?: string | null;
  floorLabel?: string;
  computerName?: string | null;
  isOnline?: boolean;
  lastSeenText?: string;
  directMessagesEnabled?: boolean;
  unread?: number;
  isBlocked?: boolean;
  isBlockedBy?: boolean;
  isArchived?: boolean;
  lastMessage?: { body: string; createdAt: string; isMine: boolean } | null;
}

type KioskModal =
  | null
  | "new-ticket"
  | "my-tickets"
  | "remote"
  | "shared-folders"
  | "personnel-directory";

interface TopToastNotification {
  id: string;
  type: "admin" | "chat";
  urgent?: boolean;
  title: string;
  subtitle?: string;
  message: string;
  avatar?: string | null;
  senderRole?: string;
  partnerId?: string;
  chatMode?: "it" | "staff";
  deviceMessageId?: string;
  deviceChat?: boolean;
  deviceChatComputerId?: string;
  notificationId?: string;
  time: string;
}

type ChatAttachment = { file: File; preview?: string; kind: "image" | "file" };
type PendingChatAction = {
  action: "block" | "clear";
  title: string;
  message: string;
  confirmText: string;
  danger?: boolean;
};

const MARSIS_URL = "http://news";
const TICKET_STATUS_LABELS: Record<string, string> = { OPEN: "Açık", IN_PROGRESS: "İşlemde", WAITING_REQUESTER: "Personelden yanıt bekleniyor", RESOLVED: "Çözüldü", CLOSED: "Kapandı", CANCELLED: "İptal edildi" };
const TICKET_CATEGORY_LABELS: Record<string, string> = { HARDWARE: "Donanım", SOFTWARE: "Yazılım", NETWORK: "Ağ", EMAIL: "E-posta", ACCOUNT_ACCESS: "Hesap / erişim", OTHER: "Diğer" };
const TICKET_PRIORITY_LABELS: Record<string, string> = { LOW: "Düşük", MEDIUM: "Orta", HIGH: "Yüksek", URGENT: "Acil" };

const DEFAULT_SHARED_FOLDERS = [
  { name: "HAVUZ", path: "\\\\192.168.3.100\\havuz", desc: "Genel Ortak Depolama & Paylaşım Alanı", size: "Ağ paylaşımı" },
  { name: "INGEST 1", path: "\\\\192.168.3.110\\ingest1", desc: "Haber Ham Kayıtları & Görüntü Girişi", size: "Ağ paylaşımı" },
  { name: "INGEST 2", path: "\\\\192.168.3.110\\ingest2", desc: "Canlı Yayın & Stüdyo Kayıt Alanı", size: "Ağ paylaşımı" },
  { name: "INGEST 4", path: "\\\\192.168.3.111\\ingest4", desc: "Montaj, Kurgu & Efekt Giriş Deposu", size: "Ağ paylaşımı" },
];

type SharedFolderInfo = (typeof DEFAULT_SHARED_FOLDERS)[number] & {
  fileCount?: number | null;
};

const FLOOR_CATEGORIES = [
  { id: "1. Kat", title: "1. Kat - Haber Merkezi & Editörler", color: "#c8102e", bg: "#fff1f2", border: "#fecdd3" },
  { id: "2. Kat", title: "2. Kat - Reji, Stüdyo & Teknik", color: "#1d4ed8", bg: "#eff6ff", border: "#bfdbfe" },
  { id: "3. Kat", title: "3. Kat - Kurgu, Montaj & Web Katı", color: "#0d9488", bg: "#f0fdfa", border: "#99f6e4" },
  { id: "5. Kat", title: "5. Kat - Muhasebe, İK & Yönetim", color: "#7c3aed", bg: "#faf5ff", border: "#e9d5ff" },
  { id: "Giriş Kat", title: "Giriş Kat - Lobi & Karşılama", color: "#d97706", bg: "#fffbeb", border: "#fde68a" },
  { id: "Diğer", title: "Saha & Diğer Birimler", color: "#475569", bg: "#f8fafc", border: "#e2e8f0" },
];

function normalizeFloor(floor?: string | null, dept?: string | null): string {
  const f = (floor || "").toLowerCase();
  const d = (dept || "").toLowerCase();
  if (f.includes("1") || d.includes("haber")) return "1. Kat";
  if (f.includes("2") || d.includes("reji") || d.includes("stüdyo") || d.includes("studyo") || d.includes("teknik") || d.includes("kamera")) return "2. Kat";
  if (f.includes("3") || d.includes("kurgu") || d.includes("montaj") || d.includes("web") || d.includes("youtube") || d.includes("sosyal")) return "3. Kat";
  if (f.includes("5") || d.includes("muhasebe") || d.includes("finans") || d.includes("insan") || d.includes("ik") || d.includes("yönetim") || d.includes("yonetim") || d.includes("reklam")) return "5. Kat";
  if (f.includes("giriş") || f.includes("giris") || f.includes("zemin") || f.includes("lobi") || d.includes("lobi") || d.includes("danışma")) return "Giriş Kat";
  return "Diğer";
}

let lastWhatsAppSoundTime = 0;
function playWhatsAppMessageSound() {
  const nowMs = Date.now();
  if (nowMs - lastWhatsAppSoundTime < 700) return;
  lastWhatsAppSoundTime = nowMs;

  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(587.33, now);
    gain1.gain.setValueAtTime(0.22, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.12);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(880, now + 0.08);
    gain2.gain.setValueAtTime(0.28, now + 0.08);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.08);
    osc2.stop(now + 0.32);
  } catch {}
}

let lastAdminSoundTime = 0;
function playAdminUrgentSound() {
  const nowMs = Date.now();
  if (nowMs - lastAdminSoundTime < 700) return;
  lastAdminSoundTime = nowMs;

  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const notes = [880, 1174.66, 1567.98];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, now + idx * 0.07);
      gain.gain.setValueAtTime(0.35, now + idx * 0.07);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.07);
      osc.stop(now + idx * 0.07 + 0.18);
    });

    const oscPulse = ctx.createOscillator();
    const gainPulse = ctx.createGain();
    oscPulse.type = "sawtooth";
    oscPulse.frequency.setValueAtTime(1567.98, now + 0.28);
    oscPulse.frequency.exponentialRampToValueAtTime(1046.5, now + 0.45);
    gainPulse.gain.setValueAtTime(0.25, now + 0.28);
    gainPulse.gain.exponentialRampToValueAtTime(0.001, now + 0.48);
    oscPulse.connect(gainPulse);
    gainPulse.connect(ctx.destination);
    oscPulse.start(now + 0.28);
    oscPulse.stop(now + 0.48);
  } catch {}
}

function getIpc() {
  if (typeof window !== "undefined") {
    try {
      return (window as any).require?.("electron")?.ipcRenderer ?? null;
    } catch {
      return null;
    }
  }
  return null;
}

const AVATAR_PALETTES = [
  { bg: "#fee2e2", text: "#b91c1c", border: "#fecdd3" },
  { bg: "#eff6ff", text: "#1d4ed8", border: "#bfdbfe" },
  { bg: "#f0fdf4", text: "#15803d", border: "#bbf7d0" },
  { bg: "#faf5ff", text: "#7e22ce", border: "#e9d5ff" },
  { bg: "#fff7ed", text: "#c2410c", border: "#fed7aa" },
  { bg: "#fdf2f8", text: "#be185d", border: "#fbcfe8" },
];

function getAvatarPalette(str?: string | null) {
  if (!str) return AVATAR_PALETTES[0];
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h << 5) - h + str.charCodeAt(i);
  return AVATAR_PALETTES[Math.abs(h) % AVATAR_PALETTES.length];
}

export function KioskUI() {
  const searchParams = useSearchParams();
  const rawHostname = searchParams.get("hostname") || "";
  const [hostname, setHostname] = useState(rawHostname && rawHostname !== "—" && rawHostname !== "â€”" ? rawHostname : "—");
  const rawUsername = searchParams.get("username") || "";
  const username = rawUsername && rawUsername !== "—" && rawUsername !== "â€”" ? rawUsername : "—";

  const [activeTab, setActiveTab] = useState<"dashboard" | "chat">("dashboard");
  const [activeModal, setActiveModal] = useState<KioskModal>(null);

  // AnyDesk
  const [anydeskId, setAnydeskId] = useState("");
  const [anydeskChecked, setAnydeskChecked] = useState(false);
  const [anydeskCopied, setAnydeskCopied] = useState(false);

  // My Tickets
  const [myTickets, setMyTickets] = useState<any[]>([]);
  const [myTicketDetail, setMyTicketDetail] = useState<any | null>(null);
  const [myTicketDetailLoading, setMyTicketDetailLoading] = useState(false);
  const [ticketsLoading, setTicketsLoading] = useState(false);

  // New Ticket modal
  const [newTicketTitle, setNewTicketTitle] = useState("");
  const [newTicketCategory, setNewTicketCategory] = useState("HARDWARE");
  const [newTicketPriority, setNewTicketPriority] = useState("MEDIUM");
  const [newTicketDescription, setNewTicketDescription] = useState("");
  const [newTicketSubmitting, setNewTicketSubmitting] = useState(false);
  const [newTicketSuccess, setNewTicketSuccess] = useState<string | null>(null);
  const [newTicketError, setNewTicketError] = useState("");
  const [newTicketAttachment, setNewTicketAttachment] = useState<File | null>(null);

  // Personnel directory state
  const [staffSearch, setStaffSearch] = useState("");
  const [staffDetail, setStaffDetail] = useState<any | null>(null);
  const [staffDetailLoading, setStaffDetailLoading] = useState(false);
  const [staffDetailError, setStaffDetailError] = useState("");
  const [collapsedFloors, setCollapsedFloors] = useState<Record<string, boolean>>({});

  // Dashboard quick IT note
  const [chatMessage, setChatMessage] = useState("");
  const [sent, setSent] = useState(false);
  const [sentMsg, setSentMsg] = useState("");
  const [sendError, setSendError] = useState("");
  // User session
  const [kioskUser, setKioskUser] = useState<KioskUser | null>(null);
  const [userLoading, setUserLoading] = useState(true);
  const [deviceAuthenticated, setDeviceAuthenticated] = useState(false);
  const [deviceChatOpen, setDeviceChatOpen] = useState(false);
  const [deviceChatUnread, setDeviceChatUnread] = useState(0);
  const [focusedDeviceId, setFocusedDeviceId] = useState<string | null>(null);
  const [pairingCode, setPairingCode] = useState("");
  const [pairingBusy, setPairingBusy] = useState(false);
  const [pairingError, setPairingError] = useState("");
  const [myDmEnabled, setMyDmEnabled] = useState<boolean>(true);
  const [isTogglingDm, setIsTogglingDm] = useState(false);

  // Live Chat state
  const [chatMode, setChatMode] = useState<"it" | "staff">("it");
  const [itContacts, setItContacts] = useState<ChatPartner[]>([]);
  const [staffContacts, setStaffContacts] = useState<ChatPartner[]>([]);
  const [chatPartnerId, setChatPartnerId] = useState<string | null>(null);
  const [chatPartner, setChatPartner] = useState<ChatPartner | null>(null);
  const [chatUnreadStaff, setChatUnreadStaff] = useState(0);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isSendingChat, setIsSendingChat] = useState(false);
  const [chatAttachment, setChatAttachment] = useState<ChatAttachment | null>(null);
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [hasOlderMessages, setHasOlderMessages] = useState(false);
  const [loadingOlderMessages, setLoadingOlderMessages] = useState(false);
  const [pendingChatAction, setPendingChatAction] = useState<PendingChatAction | null>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const prevMsgIds = useRef<Set<string>>(new Set());
  const unreadTotalRef = useRef<number | null>(null);
  const unreadContactsRef = useRef<Record<string, number>>({});
  const messagesCacheRef = useRef<Record<string, ChatMessage[]>>({});

  // IT Cockpit states
  const [itSubTab, setItSubTab] = useState<"tickets" | "staff" | "logs" | "tools" | "notifications">("tickets");
  const [adminNotifications, setAdminNotifications] = useState<KioskNotification[]>([]);
  const [ticketError, setTicketError] = useState("");
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [ticketReplyText, setTicketReplyText] = useState("");
  const [ticketReplyAttachment, setTicketReplyAttachment] = useState<File | null>(null);
  const [isSendingTicketReply, setIsSendingTicketReply] = useState(false);
  const [ticketFilter, setTicketFilter] = useState<"open" | "in_progress" | "all">("open");
  const [networkComputers, setNetworkComputers] = useState<any[]>([]);
  const [broadcastMsg, setBroadcastMsg] = useState("");
  const [broadcastSending, setBroadcastSending] = useState(false);
  const [broadcastSent, setBroadcastSent] = useState(false);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (pendingChatAction) setPendingChatAction(null);
      else if (staffDetail) setStaffDetail(null);
      else if (activeModal) { setActiveModal(null); setMyTicketDetail(null); }
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [activeModal, pendingChatAction, staffDetail]);

  // Shared Folders list
  const [sharedFoldersList, setSharedFoldersList] = useState<SharedFolderInfo[]>(
    () => DEFAULT_SHARED_FOLDERS.map((folder) => ({ ...folder }))
  );
  const [copiedPath, setCopiedPath] = useState<string | null>(null);

  // Live IP detection
  const [liveIp, setLiveIp] = useState<string>(() => {
    const p = searchParams.get("ip");
    if (p && p !== "—" && p !== "â€”" && p !== "127.0.0.1" && !p.toLowerCase().endsWith(".x")) return p;
    return "";
  });

  // Announcements & urgent banners
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [activeToast, setActiveToast] = useState<TopToastNotification | null>(null);
  const toastQueue = useRef<TopToastNotification[]>([]);
  const shownToasts = useRef(new Set<string>());
  const viewingDeviceRef = useRef<string | null>(null);
  useEffect(() => {
    const changed = (event: Event) => { viewingDeviceRef.current = (event as CustomEvent).detail?.id || null; };
    window.addEventListener("kiosk-device-conversation-state", changed);
    return () => window.removeEventListener("kiosk-device-conversation-state", changed);
  }, []);
  const contactsInitializedRef = useRef(false);
  const [realtimeConnected, setRealtimeConnected] = useState(false);
  const [kioskVisible, setKioskVisible] = useState(true);
  const conversationRef = useRef({ activeTab, chatPartnerId, myDmEnabled, kioskVisible });
  conversationRef.current = { activeTab, chatPartnerId, myDmEnabled, kioskVisible };

  useEffect(() => {
    const ipc = getIpc();
    if (!ipc) return;
    ipc.invoke("is-kiosk-visible").then((visible: unknown) => setKioskVisible(visible !== false)).catch(() => {});
    ipc.on("kiosk-visibility", (_event: unknown, detail: { visible?: boolean }) => setKioskVisible(detail?.visible !== false));
  }, []);

  useEffect(() => {
    const ipc = getIpc();
    if (!ipc) return;
    ipc.on("shared-folder-counts", (_event: unknown, counts: Record<string, number | null>) => {
      if (!counts || typeof counts !== "object") return;
      setSharedFoldersList(previous => previous.map(folder => ({ ...folder, fileCount: Object.prototype.hasOwnProperty.call(counts, folder.path) ? counts[folder.path] : null })));
    });
  }, []);

  useEffect(() => {
    try { shownToasts.current = new Set(JSON.parse(localStorage.getItem(`shown-toasts-${kioskUser?.id || "device"}`) || "[]")); } catch { shownToasts.current = new Set(); }
    contactsInitializedRef.current = false;
  }, [kioskUser?.id]);

  useEffect(() => {
    if (!activeToast) return;
    const timer = setTimeout(() => setActiveToast(current => current?.id === activeToast.id ? (toastQueue.current.shift() || null) : current), 5000);
    return () => clearTimeout(timer);
  }, [activeToast?.id]);

  useEffect(() => {
    if (!kioskUser?.id && !deviceAuthenticated) return;
    const eventUrl = hostname && hostname !== "—"
      ? `/api/kiosk-events?hostname=${encodeURIComponent(hostname)}`
      : "/api/kiosk-events";
    const stream = new EventSource(eventUrl);
    stream.addEventListener("ready", () => { setRealtimeConnected(true); window.dispatchEvent(new CustomEvent("kiosk-chat-refresh", { detail: { kind: "reconnect" } })); });
    stream.onmessage = event => {
      try {
        const detail = JSON.parse(event.data);
        if (detail.kind === "device-chat") {
          window.dispatchEvent(new Event("kiosk-device-chat-refresh"));
          if (kioskUser?.id) window.dispatchEvent(new Event("kiosk-session-refresh"));
        } else if (detail.kind === "notification") {
          window.dispatchEvent(new Event("kiosk-session-refresh"));
          window.dispatchEvent(new Event("kiosk-ticket-refresh"));
        }
        else window.dispatchEvent(new CustomEvent("kiosk-chat-refresh", { detail }));
      } catch {}
    };
    stream.onerror = () => setRealtimeConnected(false);
    return () => { stream.close(); setRealtimeConnected(false); };
  }, [kioskUser?.id, deviceAuthenticated, hostname]);

  useEffect(() => {
    if (!kioskUser?.id || !hostname || hostname === "—") return;
    const ipc = getIpc();
    if (!ipc) return;
    let cancelled = false;
    ipc.invoke("has-device-auth").then(async (hasDeviceAuth: unknown) => {
      setDeviceAuthenticated(hasDeviceAuth === true);
      if (hasDeviceAuth || cancelled) return;
      const response = await fetch("/api/device-self-enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hostname, windowsUser: username !== "—" ? username : undefined }),
      });
      const result = await response.json().catch(() => null);
      if (!cancelled && response.ok && result?.deviceId && result?.deviceToken) {
        ipc.send("save-device-auth", { deviceId: result.deviceId, deviceToken: result.deviceToken });
        setDeviceAuthenticated(true);
      }
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [kioskUser?.id, hostname, username]);

  const isItStaff = Boolean(
    kioskUser && ["SUPER_ADMIN", "TEKNIK_MUDUR", "TEKNIK_YONETMEN", "IT_AGENT"].includes(kioskUser.role)
  );

  const claimDevicePairing = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const ipc = getIpc();
    if (!ipc || hostname === "—") { setPairingError("Eşleştirme yalnızca masaüstü kiosk uygulamasında yapılabilir."); return; }
    setPairingBusy(true);
    setPairingError("");
    try {
      const response = await fetch("/api/device-pairing", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "claim", hostname, code: pairingCode.trim() }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Eşleştirme yapılamadı.");
      ipc.send("save-device-auth", { deviceId: data.deviceId, deviceToken: data.deviceToken });
      setDeviceAuthenticated(true);
      setPairingCode("");
      window.dispatchEvent(new Event("kiosk-session-refresh"));
    } catch (error) { setPairingError(error instanceof Error ? error.message : "Eşleştirme yapılamadı."); }
    finally { setPairingBusy(false); }
  };

  const popupKiosk = useCallback(() => {
    const ipc = getIpc();
    if (ipc) ipc.send("kiosk-popup");
  }, []);

  const showToastOnce = useCallback((toast: TopToastNotification, wake: boolean) => {
    if (toast.deviceChatComputerId && viewingDeviceRef.current === toast.deviceChatComputerId) return;
    if (shownToasts.current.has(toast.id)) return;
    shownToasts.current.add(toast.id);
    if (shownToasts.current.size > 300) shownToasts.current.delete(shownToasts.current.values().next().value!);
    try { localStorage.setItem(`shown-toasts-${kioskUser?.id || "device"}`, JSON.stringify([...shownToasts.current])); } catch {}
    setActiveToast(current => {
      if (current) {
        toastQueue.current.push(toast);
        return current;
      }
      return toast;
    });
    if (wake) {
      playWhatsAppMessageSound();
      popupKiosk();
      getIpc()?.send("show-notification", { title: [toast.title, toast.subtitle].filter(Boolean).join(" · "), body: toast.message });
    }
  }, [kioskUser?.id, popupKiosk]);

  const notifyIncomingChat = useCallback((incoming: ChatPartner, mode: "it" | "staff") => {
    if (conversationRef.current.kioskVisible && conversationRef.current.activeTab === "chat" && conversationRef.current.chatPartnerId === incoming.id) return;
    const shouldWakeKiosk = mode === "it" || conversationRef.current.myDmEnabled;
    if (!shouldWakeKiosk) return;
    showToastOnce({
      id: `chat-${incoming.id}-${incoming.lastMessage?.createdAt || incoming.unread}`,
      type: "chat",
      urgent: mode === "it",
      title: incoming.name || (mode === "it" ? "Teknik ekip" : "Personel"),
      subtitle: `${mode === "it" ? "Teknik destek" : "Personel sohbeti"} · ${incoming.title || incoming.department || "HalkTV"}`,
      message: incoming.lastMessage?.body || "Yeni mesajınız var.",
      avatar: incoming.image,
      partnerId: incoming.id,
      chatMode: mode,
      time: new Date().toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }),
    }, shouldWakeKiosk);
  }, [showToastOnce]);

  useEffect(() => {
    if (!deviceAuthenticated) return;
    let disposed = false;
    const preview = async () => {
      try {
        const response = await fetch("/api/device-chat", { cache: "no-store" });
        if (!response.ok) return;
        const data = await response.json();
        if (disposed) return;
        setDeviceChatUnread(data.unreadCount || 0);
        const last = (data.messages || []).filter((item: any) => item.direction === "ADMIN" && !item.readAt).at(-1);
        if ((!deviceChatOpen || !kioskVisible) && last) {
          showToastOnce({ id: `device-chat-${last.id}`, type: "admin", deviceChat: true, title: last.senderName || "Teknik destek", subtitle: last.senderTitle || "Teknik destek", message: last.body, time: new Date(last.createdAt).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }) }, true);
        }
      } catch {}
    };
    void preview();
    const timer = setInterval(() => void preview(), 45000);
    window.addEventListener("kiosk-device-chat-refresh", preview);
    return () => { disposed = true; clearInterval(timer); window.removeEventListener("kiosk-device-chat-refresh", preview); };
  }, [deviceAuthenticated, kioskUser?.id, deviceChatOpen, kioskVisible, showToastOnce]);

  // Initial IPC Info
  useEffect(() => {
    const ipc = getIpc();
    if (ipc) {
      ipc.invoke("has-device-auth").then((active: unknown) => setDeviceAuthenticated(active === true)).catch(() => {});
      ipc.invoke("get-network-info").then((info: any) => {
        if (info?.localIp && info.localIp !== "Bilinmiyor" && info.localIp !== "127.0.0.1") {
          setLiveIp(info.localIp);
        }
      }).catch(() => {});
      ipc.invoke("get-system-info").then((info: any) => {
        if (info?.hostname && info.hostname !== "—" && info.hostname !== "â€”") setHostname(String(info.hostname).trim());
      }).catch(() => {});
      ipc.invoke("get-anydesk-id").then((id: any) => {
        if (id) setAnydeskId(String(id).trim());
      }).catch(() => {}).finally(() => setAnydeskChecked(true));
      ipc.on("anydesk-id", (_event: unknown, id: unknown) => {
        setAnydeskId(typeof id === "string" ? id.trim() : "");
        setAnydeskChecked(true);
      });
      ipc.invoke("get-shared-folder-counts").then((counts: Record<string, number | null>) => {
        if (!counts || typeof counts !== "object") return;
        setSharedFoldersList((prev) => prev.map((folder) => ({
          ...folder,
          fileCount: Object.prototype.hasOwnProperty.call(counts, folder.path) ? counts[folder.path] : null,
        })));
      }).catch(() => {});
    } else {
      setAnydeskChecked(true);
    }
  }, []);

  // Fetch Session
  useEffect(() => {
    let cancelled = false;
    let sessionPending = false;
    const fetchSession = async () => {
      if (sessionPending) return;
      sessionPending = true;
      try {
        const query = new URLSearchParams();
        if (hostname && hostname !== "—") query.set("hostname", hostname);
        if (username && username !== "—") query.set("username", username);
        if (liveIp && liveIp !== "127.0.0.1") query.set("ip", liveIp);
        const res = await fetch(`/api/kiosk-session?${query.toString()}`, { cache: "no-store" });
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (!cancelled) {
          setKioskUser(data.user);
          if (data.user?.directMessagesEnabled !== undefined) {
            setMyDmEnabled(data.user.directMessagesEnabled);
          }
          if (data.clientIp && data.clientIp !== "127.0.0.1") {
            setLiveIp((prev) => (prev && prev !== "127.0.0.1" ? prev : data.clientIp));
          }
          if (data.announcements) setAnnouncements(data.announcements);
          for (const firstDeviceMessage of data.deviceMessages || []) {
            showToastOnce({
              id: `device-${firstDeviceMessage.id}`, type: "admin", urgent: firstDeviceMessage.urgent,
              title: firstDeviceMessage.sender?.name || "Teknik ekip",
              subtitle: firstDeviceMessage.sender?.title || "Ünvan belirtilmemiş",
              message: firstDeviceMessage.message, avatar: firstDeviceMessage.sender?.image,
              deviceMessageId: firstDeviceMessage.id,
              time: new Date(firstDeviceMessage.createdAt).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }),
            }, true);
          }
          // Web panel bildirimlerini de kiosk bildirim bandına taşı.
          if (data.user?.id) {
            fetch(`/api/kiosk-notifications?userId=${encodeURIComponent(data.user.id)}${hostname !== "—" ? `&hostname=${encodeURIComponent(hostname)}` : ""}`, { cache: "no-store" })
              .then((r) => r.json()).then((n) => {
                if (!cancelled) setAdminNotifications(n.notifications || []);
                // Direct messages are handled by the chat channel, avoiding duplicate alerts.
                if (cancelled) return;
                const incomingItems = (n.notifications || []).filter((item: any) => !item.isRead && item.type !== "DIRECT_MESSAGE" && !shownToasts.current.has(`notification-${item.id}`)).reverse();
                for (const incoming of incomingItems) showToastOnce({ id: `notification-${incoming.id}`, type: "admin", title: incoming.title || "Yeni bildirim", subtitle: incoming.type === "DEVICE_MESSAGE" ? "Cihaz sohbeti" : "Talep ve sistem bildirimi", message: incoming.body || "Yeni bildiriminiz var.", notificationId: incoming.id, deviceChat: incoming.type === "DEVICE_MESSAGE", deviceChatComputerId: incoming.type === "DEVICE_MESSAGE" ? incoming.entityId : undefined, time: new Date(incoming.createdAt).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" }) }, true);
              }).catch(() => {});
          }
        }
      } catch {
        // A transient network failure must not discard the visible session.
      } finally {
        sessionPending = false;
        if (!cancelled) setUserLoading(false);
      }
    };

    fetchSession();
    window.addEventListener("kiosk-session-refresh", fetchSession);
    // Bildirimler SSE ile anlık gelir; bu sorgu yalnızca bağlantı kopmasına karşı düşük maliyetli yedektir.
    const tSession = setInterval(fetchSession, 45000 + Math.floor(Math.random() * 5000));
    return () => { cancelled = true; window.removeEventListener("kiosk-session-refresh", fetchSession); clearInterval(tSession); };
  }, [hostname, username, liveIp, showToastOnce]);

  // Load Contacts
  useEffect(() => {
    if (!kioskUser) return;
    let cancelled = false;
    let contactsPending = false;

    const loadContacts = async () => {
      if (contactsPending) return;
      contactsPending = true;
      try {
        const q = new URLSearchParams({ contacts_only: "true" });
        if (kioskUser?.id) q.set("userId", kioskUser.id);
        if (hostname && hostname !== "—") q.set("hostname", hostname);
        if (username && username !== "—") q.set("username", username);

        const itQ = new URLSearchParams(q);
        itQ.set("mode", "it");
        const staffQ = new URLSearchParams(q);
        staffQ.set("mode", "staff");

        const [itRes, staffRes] = await Promise.all([
          fetch(`/api/kiosk-chat?${itQ.toString()}`, { cache: "no-store" }),
          fetch(`/api/kiosk-chat?${staffQ.toString()}`, { cache: "no-store" }),
        ]);
        if (cancelled) return;

        let nextItContacts: any[] = [];
        if (itRes.ok) {
          const itData = await itRes.json();
          if (itData.contacts) {
            nextItContacts = itData.contacts;
            setItContacts(itData.contacts);
            const incoming = itData.contacts.find((c: ChatPartner) => (c.unread || 0) > (unreadContactsRef.current[c.id] || 0) && c.lastMessage && !c.lastMessage.isMine);
            if (incoming && contactsInitializedRef.current) {
              notifyIncomingChat(incoming, "it");
            }
            for (const c of itData.contacts) unreadContactsRef.current[c.id] = c.unread || 0;
          }
        }
        if (staffRes.ok) {
          const staffData = await staffRes.json();
          if (staffData.contacts) {
            setStaffContacts(staffData.contacts);
            const incoming = staffData.contacts.find((c: ChatPartner) => (c.unread || 0) > (unreadContactsRef.current[c.id] || 0) && c.lastMessage && !c.lastMessage.isMine);
            if (incoming && contactsInitializedRef.current) {
              notifyIncomingChat(incoming, "staff");
            }
            for (const c of staffData.contacts) unreadContactsRef.current[c.id] = c.unread || 0;
            const itUnread = nextItContacts.reduce((sum: number, c: any) => sum + (c.unread || 0), 0);
            const staffUnread = staffData.contacts.reduce((sum: number, c: any) => sum + (c.unread || 0), 0);
            const total = staffUnread + itUnread;
            unreadTotalRef.current = total;
            setChatUnreadStaff(total);
            contactsInitializedRef.current = true;
          }
        }
      } catch {} finally { contactsPending = false; }
    };

    let refreshTimer: ReturnType<typeof setTimeout>;
    const refresh = (event: Event) => {
      if ((event as CustomEvent).detail?.kind === "typing") return;
      clearTimeout(refreshTimer);
      refreshTimer = setTimeout(loadContacts, 120);
    };
    window.addEventListener("kiosk-chat-refresh", refresh);
    loadContacts();
    const t = setInterval(loadContacts, 30000 + Math.floor(Math.random() * 5000));
    return () => { cancelled = true; clearInterval(t); clearTimeout(refreshTimer); window.removeEventListener("kiosk-chat-refresh", refresh); };
  }, [kioskUser?.id, hostname, username, notifyIncomingChat]);

  // Load Messages for active partner
  useEffect(() => {
    if (activeTab !== "chat" || !kioskUser || !chatPartnerId) return;
    let cancelled = false;
    let initialLoad = true;
    let pending = false;
    const cachedMessages = messagesCacheRef.current[chatPartnerId];
    if (cachedMessages?.length) setMessages(cachedMessages);
    const loadMessages = async () => {
      if (pending) return;
      pending = true;
      try {
        const query = new URLSearchParams({ partnerId: chatPartnerId });
        query.set("markRead", kioskVisible ? "true" : "false");
        if (kioskUser?.id) query.set("userId", kioskUser.id);
        const res = await fetch(`/api/kiosk-chat?${query.toString()}`, { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled || !data.ok) return;
        const newMessages: ChatMessage[] = data.messages || [];
        setHasOlderMessages(Boolean(data.hasMore));
        setPartnerTyping(Boolean(data.partnerTyping));
        // The conversation is already open: no duplicate popup, sound or Windows alert.
        if (data.partner) setChatPartner(data.partner);
        initialLoad = false;
        setMessages(prev => {
          const byId = new Map<string, ChatMessage>();
          for (const message of prev) {
            if (message.id.startsWith("temp-") && newMessages.some(candidate => candidate.fromMe && candidate.body === message.body)) continue;
            byId.set(message.id, message);
          }
          for (const message of newMessages) byId.set(message.id, message);
          const merged = [...byId.values()].sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
          messagesCacheRef.current[chatPartnerId] = merged;
          return merged;
        });
      } catch {} finally { pending = false; }
    };

    loadMessages();
    const refresh = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      if (!detail?.partnerId || detail.partnerId === chatPartnerId) void loadMessages();
    };
    window.addEventListener("kiosk-chat-refresh", refresh);
    const t = setInterval(loadMessages, realtimeConnected ? 15000 : 2000);
    return () => { cancelled = true; clearInterval(t); window.removeEventListener("kiosk-chat-refresh", refresh); };
  }, [activeTab, kioskUser?.id, chatPartnerId, realtimeConnected, kioskVisible]);

  const loadOlderMessages = useCallback(async () => {
    if (!chatPartnerId || !messages.length || loadingOlderMessages) return;
    setLoadingOlderMessages(true);
    try {
      const query = new URLSearchParams({ partnerId: chatPartnerId, before: messages[0].createdAt, markRead: "false" });
      const response = await fetch(`/api/kiosk-chat?${query.toString()}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok || !data.ok) return;
      setMessages(previous => {
        const byId = new Map<string, ChatMessage>();
        for (const message of [...(data.messages || []), ...previous]) byId.set(message.id, message);
        const merged = [...byId.values()].sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
        messagesCacheRef.current[chatPartnerId] = merged;
        return merged;
      });
      setHasOlderMessages(Boolean(data.hasMore));
    } finally { setLoadingOlderMessages(false); }
  }, [chatPartnerId, messages, loadingOlderMessages]);

  useEffect(() => {
    if (!partnerTyping) return;
    const timer = setTimeout(() => setPartnerTyping(false), 5000);
    return () => clearTimeout(timer);
  }, [partnerTyping, messages]);

  useEffect(() => {
    if (!kioskUser?.id || !chatPartnerId || activeTab !== "chat") return;
    const isTyping = chatInput.trim().length > 0;
    const timeout = window.setTimeout(() => {
      fetch("/api/kiosk-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "typing",
          partnerId: chatPartnerId,
          isTyping,
          userId: kioskUser.id,
          hostname: hostname !== "—" ? hostname : undefined,
          username: username !== "—" ? username : undefined,
        }),
      }).catch(() => {});
    }, isTyping ? 250 : 0);
    return () => window.clearTimeout(timeout);
  }, [chatInput, chatPartnerId, activeTab, kioskUser?.id, hostname, username]);

  // Auto scroll chat to bottom
  useEffect(() => {
    if (activeTab === "chat" && chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, activeTab]);

  // Load Tickets
  const loadTickets = useCallback(async () => {
    setTicketsLoading(true);
    try {
      const q = new URLSearchParams();
      if (kioskUser?.id) q.set("userId", kioskUser.id);
      if (hostname && hostname !== "—") q.set("hostname", hostname);
      const res = await fetch(`/api/kiosk-tickets?${q.toString()}`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setMyTickets(data.tickets || []);
      }
    } catch {} finally {
      setTicketsLoading(false);
    }
  }, [kioskUser?.id, hostname]);

  const openMyTicket = useCallback(async (ticketId: string) => {
    setMyTicketDetail(null);
    setTicketError("");
    setMyTicketDetailLoading(true);
    try {
      const q = new URLSearchParams({ ticketId });
      if (kioskUser?.id) q.set("userId", kioskUser.id);
      if (hostname && hostname !== "—") q.set("hostname", hostname);
      const res = await fetch(`/api/kiosk-tickets?${q.toString()}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Talep yüklenemedi.");
      setMyTicketDetail(data.ticket || null);
    } catch (error) { setTicketError(error instanceof Error ? error.message : "Talep yüklenemedi."); }
    finally { setMyTicketDetailLoading(false); }
  }, [kioskUser?.id, hostname]);

  useEffect(() => {
    if (activeModal !== "my-tickets") return;
    const refresh = () => {
      void loadTickets();
      if (myTicketDetail?.id) void openMyTicket(myTicketDetail.id);
    };
    window.addEventListener("kiosk-ticket-refresh", refresh);
    return () => window.removeEventListener("kiosk-ticket-refresh", refresh);
  }, [activeModal, myTicketDetail?.id, loadTickets, openMyTicket]);

  const handleTicketReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!myTicketDetail?.id || (!ticketReplyText.trim() && !ticketReplyAttachment) || isSendingTicketReply || !kioskUser) return;
    setIsSendingTicketReply(true);
    setTicketError("");
    try {
      let attachment = null;
      if (ticketReplyAttachment) attachment = await uploadTicketFile(ticketReplyAttachment);
      const res = await fetch("/api/kiosk-tickets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "comment", ticketId: myTicketDetail.id, commentText: ticketReplyText.trim(), attachment, userId: kioskUser.id, hostname, username }) });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Yanıt gönderilemedi");
      setTicketReplyText("");
      setTicketReplyAttachment(null);
      await openMyTicket(myTicketDetail.id);
      await loadTickets();
    } catch (error: any) { setTicketError(error?.message || "Yanıt gönderilemedi."); }
    finally { setIsSendingTicketReply(false); }
  };

  const validateTicketFile = (file: File) => {
    const extension = file.name.split(".").pop()?.toLowerCase() || "";
    if (file.size > 50 * 1024 * 1024) throw new Error("Dosya boyutu 50 MB'yi aşamaz.");
    if (["exe", "bat", "cmd", "com", "msi", "ps1", "scr", "vbs", "js", "jse", "wsf", "hta", "lnk"].includes(extension)) {
      throw new Error("Çalıştırılabilir ve komut dosyaları yüklenemez.");
    }
  };

  const uploadTicketFile = async (file: File) => {
    validateTicketFile(file);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("subfolder", "tickets");
    const response = await fetch("/api/upload", { method: "POST", body: formData });
    const result = await response.json();
    if (!response.ok || !result.ok) throw new Error(result.error || "Dosya yüklenemedi.");
    return { url: result.url, fileName: result.fileName, mimeType: result.mimeType, sizeBytes: result.sizeBytes, claimToken: result.claimToken };
  };

  // Load Network Computers for IT VNC
  const loadComputers = useCallback(async () => {
    if (!isItStaff) return;
    try {
      const res = await fetch("/api/kiosk-computers", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setNetworkComputers(data.computers || []);
      }
    } catch {}
  }, [isItStaff]);

  useEffect(() => {
    const ipc = getIpc();
    if (!ipc) return;
    ipc.on("vnc-launch-result", (_event: unknown, result: { connectionId?: string; success?: boolean; error?: string }) => {
      if (!result?.connectionId) return;
      void fetch("/api/vnc-connections", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "result", ...result }) })
        .finally(() => void loadComputers());
    });
  }, [loadComputers]);

  useEffect(() => {
    if (isItStaff && itSubTab === "tools") loadComputers();
    if (isItStaff && itSubTab === "tickets") loadTickets();
  }, [isItStaff, itSubTab, loadComputers, loadTickets]);

  useEffect(() => {
    if (!isItStaff || itSubTab !== "tools") return;
    const timer = window.setInterval(loadComputers, 30_000);
    window.addEventListener("kiosk-device-chat-refresh", loadComputers);
    return () => { window.clearInterval(timer); window.removeEventListener("kiosk-device-chat-refresh", loadComputers); };
  }, [isItStaff, itSubTab, loadComputers]);

  useEffect(() => {
    const requestedDevice = searchParams.get("deviceChat");
    if (!isItStaff || !requestedDevice) return;
    setFocusedDeviceId(requestedDevice);
    setItSubTab("tools");
    setActiveTab("dashboard");
  }, [isItStaff, searchParams]);

  const openDeviceConversation = (id: string) => {
    setFocusedDeviceId(id);
    setItSubTab("tools");
    setActiveTab("dashboard");
    void loadComputers();
  };

  const handleTicketStatus = async (status: string) => {
    if (!myTicketDetail?.id || !kioskUser || isSendingTicketReply) return;
    setIsSendingTicketReply(true);
    setTicketError("");
    try {
      const response = await fetch("/api/kiosk-tickets", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "status", ticketId: myTicketDetail.id, status, userId: kioskUser.id, hostname, username, ip: liveIp }) });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || "Talep durumu değiştirilemedi.");
      await Promise.all([openMyTicket(myTicketDetail.id), loadTickets()]);
    } catch (error) { setTicketError(error instanceof Error ? error.message : "Talep durumu değiştirilemedi."); }
    finally { setIsSendingTicketReply(false); }
  };

  const handleDeviceCommand = async (computerName: string, type: string) => {
    const response = await fetch("/api/device-commands", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ computerName, type }) });
    const data = await response.json();
    if (!response.ok || !data.ok) throw new Error(data.error || "Komut gönderilemedi.");
  };

  async function openStaffDetail(id: string) {
    setStaffDetailLoading(true); setStaffDetailError(""); setStaffDetail({ id });
    try {
      const response = await fetch(`/api/kiosk-personnel/${encodeURIComponent(id)}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || "Personel bilgisi alınamadı.");
      setStaffDetail(data.person);
    } catch (error: any) { setStaffDetailError(error.message || "Personel bilgisi alınamadı."); }
    finally { setStaffDetailLoading(false); }
  }

  async function markAdminNotification(id?: string) {
    const response = await fetch("/api/kiosk-notifications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: id ? "mark_read" : "mark_all_read", id, hostname: hostname !== "—" ? hostname : undefined, username: username !== "—" ? username : undefined }) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.ok) throw new Error(result.error || "Bildirim güncellenemedi.");
    setAdminNotifications(items => items.map(n => !id || n.id === id ? { ...n, isRead: true } : n));
  }

  async function deleteAdminNotification(id?: string) {
    const response = await fetch("/api/kiosk-notifications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: id ? "delete" : "delete_all", id, hostname: hostname !== "—" ? hostname : undefined, username: username !== "—" ? username : undefined }) });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.ok) throw new Error(result.error || "Bildirim silinemedi.");
    setAdminNotifications(items => id ? items.filter(n => n.id !== id) : []);
  }

  // DND (Mesaj Alımı) Toggle
  const handleToggleDm = async () => {
    if (isTogglingDm || !kioskUser) return;
    setIsTogglingDm(true);
    const nextVal = !myDmEnabled;
    setMyDmEnabled(nextVal);
    try {
      await fetch("/api/kiosk-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "toggle_dm",
          enabled: nextVal,
          userId: kioskUser.id,
          hostname: hostname !== "—" ? hostname : undefined,
          username: username !== "—" ? username : undefined,
        }),
      });
      setKioskUser((prev) => (prev ? { ...prev, directMessagesEnabled: nextVal } : null));
    } catch {} finally {
      setIsTogglingDm(false);
    }
  };

  const closeActiveToast = async () => {
    const id = activeToast?.deviceMessageId;
    const notificationId = (activeToast as any)?.notificationId;
    setActiveToast(toastQueue.current.shift() || null);
    if (notificationId) {
      try { await fetch("/api/kiosk-notifications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "mark_read", id: notificationId, userId: kioskUser?.id, hostname, username }) }); } catch {}
    }
    if (!id) return;
    try {
      await fetch("/api/device-message/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, hostname }),
      });
    } catch {}
  };

  const [chatSendError, setChatSendError] = useState("");
  const openChat = (mode: "it" | "staff") => {
    setChatMode(mode); setChatPartnerId(null); setChatPartner(null);
    setMessages([]); setChatAttachment(null); setPartnerTyping(false); setChatSendError(""); setActiveTab("chat");
  };
  const openPerson = (person: Person, mode: "it" | "staff") => {
    setChatMode(mode); setChatPartnerId(person.id); setChatPartner(person);
    setMessages(messagesCacheRef.current[person.id] || []); setChatAttachment(null); setPartnerTyping(false); prevMsgIds.current.clear(); setChatSendError(""); setActiveTab("chat");
  };

  const openMarsis = () => {
    const ipc = getIpc();
    if (ipc) ipc.send("kiosk-connect-marsis", MARSIS_URL);
    else window.open(MARSIS_URL, "_blank");
  };

  // Send message in chat
  const handleSendInChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!chatInput.trim() && !chatAttachment) || isSendingChat || !chatPartnerId || !kioskUser) return;
    const msgText = chatInput.trim();
    const pendingAttachment = chatAttachment;
    setChatSendError("");
    setChatInput("");
    setChatAttachment(null);
    setIsSendingChat(true);

    const tempMsg: ChatMessage = {
      id: "temp-" + Date.now(),
      body: msgText || (pendingAttachment?.kind === "image" ? "Görsel" : pendingAttachment ? "Dosya" : ""),
      fromMe: true,
      createdAt: new Date().toISOString(),
      isRead: false,
      attachmentUrl: pendingAttachment?.preview || null,
      attachmentName: pendingAttachment?.file.name || null,
      attachmentType: pendingAttachment?.kind || null,
    };
    setMessages((prev) => { const next = [...prev, tempMsg]; messagesCacheRef.current[chatPartnerId] = next; return next; });
    prevMsgIds.current.add(tempMsg.id);

    try {
      let uploadedUrl: string | null = null;
      let uploadedName: string | null = null;
      let uploadedType: string | null = null;
      let attachmentClaimToken: string | null = null;

      if (pendingAttachment) {
        const fd = new FormData();
        fd.append("file", pendingAttachment.file);
        fd.append("subfolder", "messages");
        const uploadRes = await fetch("/api/upload", { method: "POST", body: fd });
        if (!uploadRes.ok) throw new Error("Dosya yüklenemedi.");
        const uploadData = await uploadRes.json();
        uploadedUrl = uploadData.url || null;
        uploadedName = pendingAttachment.file.name;
        uploadedType = pendingAttachment.kind;
        attachmentClaimToken = uploadData.claimToken || null;
      }

      const res = await fetch("/api/kiosk-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: msgText,
          recipientId: chatPartnerId,
          attachmentUrl: uploadedUrl,
          attachmentName: uploadedName,
          attachmentType: uploadedType,
          attachmentClaimToken,
          channelMode: chatMode,
          userId: kioskUser.id,
          hostname: hostname !== "—" ? hostname : undefined,
          username: username !== "—" ? username : undefined,
        }),
      });
      const data = await res.json();
      if (data.ok && data.message) {
        prevMsgIds.current.add(data.message.id);
        setMessages((prev) => { const next = prev.map((m) => (m.id === tempMsg.id ? data.message : m)); messagesCacheRef.current[chatPartnerId] = next; return next; });
      } else if (!data.ok) {
        setChatSendError(data.error || "Mesaj iletilemedi. Yeniden deneyin.");
        setChatInput(msgText);
        if (pendingAttachment) setChatAttachment(pendingAttachment);
        setMessages((prev) => { const next = prev.filter((m) => m.id !== tempMsg.id); messagesCacheRef.current[chatPartnerId] = next; return next; });
      }
    } catch (error: any) {
      setChatSendError(error?.message || "Bağlantı kesildi. Mesajınız gönderilmedi.");
      setChatInput(msgText);
      if (pendingAttachment) setChatAttachment(pendingAttachment);
      setMessages((prev) => { const next = prev.filter((m) => m.id !== tempMsg.id); messagesCacheRef.current[chatPartnerId] = next; return next; });
    } finally {
      setIsSendingChat(false);
    }
  };

  const handleAttachChatFile = (file: File) => {
    if (file.size > 50 * 1024 * 1024) {
      setChatSendError("Dosya boyutu 50 MB üzerinde olamaz.");
      return;
    }
    const extension = file.name.split(".").pop()?.toLocaleLowerCase("tr-TR") || "";
    if (["exe", "bat", "cmd", "com", "msi", "ps1", "scr", "vbs", "js", "jse", "wsf", "hta", "lnk"].includes(extension)) {
      setChatSendError("Çalıştırılabilir veya komut dosyaları yüklenemez.");
      return;
    }
    setChatSendError("");
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setChatAttachment({ file, kind: "image", preview: String(event.target?.result || "") });
      };
      reader.readAsDataURL(file);
      return;
    }
    setChatAttachment({ file, kind: "file" });
  };

  const runChatAction = async (action: "block" | "clear" | "archive" | "unarchive") => {
    if (!chatPartnerId || !kioskUser) return;
    const actionName = action === "block" ? (chatPartner?.isBlocked ? "unblock_user" : "block_user") : action === "clear" ? "clear_chat" : action === "unarchive" ? "unarchive_chat" : "archive_chat";
    try {
      const res = await fetch("/api/kiosk-chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: actionName, partnerId: chatPartnerId, userId: kioskUser.id, hostname, username }) });
      if (!res.ok) throw new Error();
      if (action === "clear" || action === "archive" || action === "unarchive") { setMessages([]); if (chatPartnerId) delete messagesCacheRef.current[chatPartnerId]; setChatPartner(null); setChatPartnerId(null); setActiveTab("chat"); }
      if (action === "block") setChatPartner((p) => p ? { ...p, isBlocked: actionName === "block_user" } : p);
    } catch { setChatSendError("Sohbet işlemi gerçekleştirilemedi."); }
  };

  const handleChatAction = (action: "block" | "clear" | "archive" | "unarchive") => {
    if (action === "archive" || action === "unarchive") {
      void runChatAction(action);
      return;
    }
    if (action === "clear") {
      setPendingChatAction({
        action,
        title: "Sohbet temizlensin mi?",
        message: "Bu konuşma geçmişi sizin kiosk ekranınızdan kaldırılacak. Karşı tarafın ekranındaki mesajlara dokunulmaz.",
        confirmText: "Sohbeti temizle",
        danger: true,
      });
      return;
    }
    const willBlock = !chatPartner?.isBlocked;
    setPendingChatAction({
      action,
      title: willBlock ? "Kişi engellensin mi?" : "Engel kaldırılsın mı?",
      message: willBlock ? "Bu kişi size personel sohbetinden mesaj gönderemeyecek." : "Bu kişi yeniden size mesaj gönderebilir.",
      confirmText: willBlock ? "Engelle" : "Engeli kaldır",
      danger: willBlock,
    });
  };

  // Quick IT note on dashboard
  const handleSendQuickMsg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim()) return;
    setSent(false);
    setSendError("");
    try {
      const res = await fetch("/api/kiosk-quickmsg", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: chatMessage.trim(),
          hostname: hostname !== "—" ? hostname : undefined,
          username: username !== "—" ? username : undefined,
          userId: kioskUser?.id,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setSent(true);
        setSentMsg(`✓ IT ekibine başarıyla iletildi!`);
        setChatMessage("");
        setTimeout(() => setSent(false), 4000);
      } else {
        setSendError(data.error || "İletilemedi.");
      }
    } catch {
      setSendError("Bağlantı hatası.");
    }
  };

  // Copy AnyDesk
  const handleCopyAnydesk = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!anydeskId) return;
    try {
      navigator.clipboard.writeText(anydeskId);
      setAnydeskCopied(true);
      setTimeout(() => setAnydeskCopied(false), 2000);
    } catch {}
  };

  // Copy UNC path
  const handleCopyPath = (p: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      navigator.clipboard.writeText(p);
      setCopiedPath(p);
      setTimeout(() => setCopiedPath(null), 2000);
    } catch {}
  };

  const handleOpenPath = (p: string) => {
    const ipc = getIpc();
    if (ipc) {
      ipc.send("open-path", p);
    } else {
      handleCopyPath(p);
      alert("Ağ yolu panoya kopyalandı:\n" + p);
    }
  };

  // Logout
  const handleKioskLogout = async () => {
    try {
      document.cookie = "kiosk_logged_out=1; path=/; max-age=31536000";
      await fetch("/api/kiosk-logout", { method: "POST" });
    } catch {}
    setKioskUser(null);
    setActiveTab("dashboard");
    const ipc = getIpc();
    if (ipc) ipc.send("kiosk-request-logout");
  };

  // Create Ticket
  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTicketTitle.trim() || !newTicketDescription.trim()) {
      setNewTicketError("Lütfen başlık ve açıklama giriniz.");
      return;
    }
    setNewTicketSubmitting(true);
    setNewTicketError("");
    try {
      let attachment = null;
      if (newTicketAttachment) attachment = await uploadTicketFile(newTicketAttachment);
      const res = await fetch("/api/kiosk-tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          title: newTicketTitle.trim(),
          description: newTicketDescription.trim(),
          category: newTicketCategory,
          priority: newTicketPriority,
          anydeskId,
          ip: liveIp,
          userId: kioskUser?.id,
          hostname: hostname !== "—" ? hostname : undefined,
          username: username !== "—" ? username : undefined,
          attachment,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setNewTicketSuccess(data.ticket?.number || "Oluşturuldu");
        setNewTicketTitle("");
        setNewTicketDescription("");
        setNewTicketAttachment(null);
        setTimeout(() => {
          setNewTicketSuccess(null);
          setActiveModal("my-tickets");
          loadTickets();
        }, 1200);
      } else {
        setNewTicketError(data.error || "Talep oluşturulamadı");
      }
    } catch {
      setNewTicketError("Bağlantı hatası oluştu.");
    } finally {
      setNewTicketSubmitting(false);
    }
  };

  // Broadcast for IT
  const handleSendBroadcast = async () => {
    if (!broadcastMsg.trim()) return;
    setBroadcastSending(true);
    try {
      const res = await fetch("/api/kiosk-admin-broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: broadcastMsg.trim(), userId: kioskUser?.id, target: "ALL", urgent: true }),
      });
      const data = await res.json();
      if (data.ok) {
        setBroadcastSent(true);
        setBroadcastMsg("");
        setTimeout(() => setBroadcastSent(false), 3000);
      }
    } catch {} finally {
      setBroadcastSending(false);
    }
  };

  // Launch TightVNC
  const handleLaunchVnc = async (target: Device | string) => {
    const targetIp = typeof target === "string" ? target : target.ip || "";
    if (!targetIp) return;
    let connectionId = "";
    try {
      const response = await fetch("/api/vnc-connections", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ targetId: typeof target === "string" ? undefined : target.id, targetName: typeof target === "string" ? undefined : target.name, targetIp, sourceComputerName: hostname }) });
      const result = await response.json();
      if (!response.ok || !result.ok) throw new Error(result.error || "Bağlantı kaydı oluşturulamadı.");
      connectionId = result.connectionId || "";
    } catch (error) {
      alert(error instanceof Error ? error.message : "Bağlantı başlatılamadı.");
      return;
    }
    const ipc = getIpc();
    if (ipc) {
      ipc.send("launch-tightvnc", { ip: targetIp, name: typeof target === "string" ? undefined : target.name, connectionId });
      window.setTimeout(loadComputers, 1200);
    } else {
      alert("TightVNC yalnızca masaüstü uygulamasında doğrudan başlatılabilir: " + targetIp);
    }
  };

  // Avatar Renderer with Google photo & fallback
  const renderAvatar = (
    person: { id?: string; name?: string | null; email?: string | null; image?: string | null; isOnline?: boolean },
    size = 32,
    showStatusDot = false
  ) => {
    const initial = person?.name
      ? person.name.charAt(0).toUpperCase()
      : (person?.email ? person.email.charAt(0).toUpperCase() : "H");
    const theme = getAvatarPalette(person?.name || person?.email);
    return (
      <div style={{ position: "relative", width: size, height: size, flexShrink: 0 }}>
        <div style={{
          width: size,
          height: size,
          borderRadius: "50%",
          background: theme.bg,
          border: `1px solid ${theme.border}`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: size * 0.42,
          fontWeight: 800,
          color: theme.text,
          overflow: "hidden",
          boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
        }}>
          {person?.image ? (
            <img
              src={person.id && person.image.includes("googleusercontent.com") ? `/api/avatar/${encodeURIComponent(person.id)}` : person.image}
              alt=""
              referrerPolicy="no-referrer"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
              onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = "/halktv-logo.png"; }}
            />
          ) : (
            <img src="/halktv-logo.png" alt="HalkTV" style={{ width: "68%", height: "68%", objectFit: "contain" }} />
          )}
        </div>
        {showStatusDot && (
          <span
            style={{
              position: "absolute",
              bottom: 0,
              right: 0,
              width: Math.max(7, size * 0.28),
              height: Math.max(7, size * 0.28),
              borderRadius: "50%",
              background: person.isOnline ? "#16a34a" : "#94a3b8",
              border: "1.5px solid #ffffff",
              boxShadow: person.isOnline ? "0 0 4px #16a34a" : "none",
            }}
          />
        )}
      </div>
    );
  };

  // Filtered staff grouped by floor
  const staffByFloor = useMemo(() => {
    const q = staffSearch.trim().toLowerCase();
    const filtered = staffContacts.filter((c) => {
      if (!q) return true;
      return (
        c.name?.toLowerCase().includes(q) ||
        c.department?.toLowerCase().includes(q) ||
        c.title?.toLowerCase().includes(q) ||
        c.floor?.toLowerCase().includes(q) ||
        c.computerName?.toLowerCase().includes(q)
      );
    });

    const groups: Record<string, ChatPartner[]> = {};
    FLOOR_CATEGORIES.forEach((fc) => {
      groups[fc.id] = [];
    });

    filtered.forEach((staff) => {
      const fl = normalizeFloor(staff.floor, staff.department);
      if (!groups[fl]) groups[fl] = [];
      groups[fl].push(staff);
    });

    return groups;
  }, [staffContacts, staffSearch]);

  const navBtnStyle: React.CSSProperties = {
    background: "#fff",
    border: "1px solid #e2e8f0",
    borderRadius: 8,
    padding: "10px 8px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    cursor: "pointer",
    transition: "all 0.15s ease",
    boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
  };

  return (
    <>
      <div style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        background: "#f8fafc",
        fontFamily: "'Segoe UI Variable Text', 'Segoe UI', sans-serif",
        userSelect: "text",
        overflow: "hidden",
        color: "#0f172a",
      }}>

        {/* ── Title Bar ── */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 10px",
          height: 48,
          flexShrink: 0,
          background: "#c8102e",
          WebkitAppRegion: "no-drag",
          userSelect: "none",
        } as React.CSSProperties}>
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <img src="/halktv-logo.png" alt="HalkTV" style={{ height: 18, width: "auto" }} />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
            {kioskUser && (
              <button
                onClick={() => setActiveTab(activeTab === "dashboard" ? "chat" : "dashboard")}
                title={activeTab === "dashboard" ? "Canlı Sohbet" : "Ana Panel"}
                style={{
                  background: activeTab === "chat" ? "#ffffff" : "rgba(255,255,255,0.2)",
                  color: activeTab === "chat" ? "#c8102e" : "#ffffff",
                  border: "none",
                  borderRadius: 4,
                  padding: "4px 8px",
                  fontSize: 10,
                  fontWeight: 800,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  transition: "all 0.12s",
                }}
              >
                <HiOutlineChatBubbleLeftRight size={13} />
                <span>{activeTab === "dashboard" ? "Sohbet" : "Panel"}</span>
                {chatUnreadStaff > 0 && activeTab === "dashboard" && (
                  <span style={{ background: "#22c55e", color: "#fff", fontSize: 8.5, borderRadius: 10, padding: "0 4px", fontWeight: 900 }}>
                    {chatUnreadStaff}
                  </span>
                )}
              </button>
            )}

            <button
              onClick={() => {
                const ipc = getIpc();
                if (ipc) ipc.send("kiosk-minimize");
              }}
              title="Küçült"
              style={{
                background: "rgba(255,255,255,0.15)",
                border: "none",
                borderRadius: 4,
                color: "#fff",
                width: 26,
                height: 26,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <HiMinus size={13} />
            </button>
          </div>
        </div>

        {/* ── MAIN CONTENT ── */}
        {kioskUser && deviceAuthenticated && <button type="button" onClick={() => { setActiveTab("dashboard"); setDeviceChatOpen(true); }} style={{ border: 0, padding: "5px 9px", background: "#f4edf0", color: "#71394b", fontSize: 10, cursor: "pointer" }}>Bu bilgisayar için teknik destek{deviceChatUnread > 0 ? ` · ${deviceChatUnread} yeni mesaj` : ""}</button>}
        {activeTab === "dashboard" ? (
          <div style={{ flex: 1, minHeight: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
            {userLoading ? (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, color: "#94a3b8" }}>
                <HiOutlineArrowPath size={22} className="animate-spin" />
                <span style={{ fontSize: 11, fontWeight: 600 }}>Oturum bilgisi yükleniyor...</span>
              </div>
            ) : deviceChatOpen ? (
              <div style={{ flex: 1, minHeight: 0, padding: 9, background: "#f7f2f3" }}>
                <DeviceConversation guest visible={kioskVisible} onClose={() => { setDeviceChatOpen(false); setDeviceChatUnread(0); }} />
              </div>
            ) : !kioskUser ? (
              /* ══════════════════════════════════════════════════════════════
                 MİSAFİR MODU (GİRİŞ EKRANI — ORTALANMIŞ & SADE)
                 ══════════════════════════════════════════════════════════════ */
              <div style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "20px 16px",
                textAlign: "center",
                background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
              }}>
                <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#fee2e2", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12, border: "2px solid #fecdd3" }}>
                  <img src="/halktv-logo.png" alt="HalkTV" style={{ width: 34, height: "auto" }} />
                </div>

                <h1 style={{ fontSize: 15, fontWeight: 900, color: "#5b1021", margin: "0 0 3px", letterSpacing: "-0.01em" }}>
                  HalkTV Destek Merkezi
                </h1>
                <p style={{ fontSize: 10.5, color: "#8a6970", margin: "0 0 16px" }}>
                  Kurumsal servis ve destek hizmetlerine erişmek için giriş yapınız.
                </p>

                {/* Cihaz Bilgileri Kutusu */}
                <div style={{
                  width: "100%",
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: 9,
                  padding: "10px 12px",
                  marginBottom: 14,
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                  textAlign: "left",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.03)",
                }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #f1f5f9", paddingBottom: 5 }}>
                    <span style={{ fontSize: 9, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      Cihaz Bilgileri
                    </span>
                    <span style={{ fontSize: 9, fontWeight: 700, color: deviceAuthenticated ? "#15803d" : "#a16207", display: "flex", alignItems: "center", gap: 4 }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: deviceAuthenticated ? "#16a34a" : "#d69e2e", display: "inline-block" }} />
                      {deviceAuthenticated ? "Cihaz eşleştirildi" : "Eşleştirme gerekli"}
                    </span>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 10, color: "#64748b", fontWeight: 600 }}>Bilgisayar Adı:</span>
                    <span style={{ fontSize: 11, fontWeight: 800, color: "#0f172a", fontFamily: "monospace", background: "#f1f5f9", padding: "2px 6px", borderRadius: 4 }}>
                      {hostname}
                    </span>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 10, color: "#64748b", fontWeight: 600 }}>Yerel IP Adresi:</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#1d4ed8", fontFamily: "monospace" }}>
                      {liveIp || "Algılanıyor..."}
                    </span>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 10, color: "#64748b", fontWeight: 600 }}>Windows Hesabı:</span>
                    <span style={{ fontSize: 10.5, fontWeight: 600, color: "#475569", fontFamily: "monospace" }}>
                      {username}
                    </span>
                  </div>

                  {anydeskId && (
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: 4, borderTop: "1px dashed #e2e8f0" }}>
                      <span style={{ fontSize: 10, color: "#b91c1c", fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
                        <img src="/anydesk-logo.svg" alt="AnyDesk" style={{ width: 12, height: 12 }} /> AnyDesk ID:
                      </span>
                      <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                        <span style={{ fontSize: 11, fontWeight: 800, color: "#b91c1c", fontFamily: "monospace" }}>
                          {anydeskId}
                        </span>
                        <button
                          type="button"
                          onClick={handleCopyAnydesk}
                          style={{
                            background: anydeskCopied ? "#16a34a" : "#fff",
                            color: anydeskCopied ? "#fff" : "#b91c1c",
                            border: "1px solid #fecdd3",
                            borderRadius: 4,
                            padding: "1px 5px",
                            fontSize: 8.5,
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          {anydeskCopied ? "✓" : "Kopyala"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Giriş Butonları */}
                <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => {
                      const ipc = getIpc();
                      if (ipc) ipc.send("kiosk-google-login");
                      else signIn("google", { callbackUrl: "/kiosk" });
                    }}
                    style={{
                      width: "100%",
                      background: "#c8102e",
                      color: "#ffffff",
                      border: "none",
                      padding: "10px 14px",
                      borderRadius: 8,
                      fontSize: 12,
                      fontWeight: 800,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      boxShadow: "0 2px 6px rgba(200, 16, 46, 0.25)",
                      transition: "all 0.15s ease",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "#a50d24"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "#c8102e"; }}
                  >
                    <svg viewBox="0 0 24 24" width="16" height="16" xmlns="http://www.w3.org/2000/svg" style={{ background: "#fff", borderRadius: "50%", padding: 2 }}>
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    <span>HalkTV Maili ile Giriş Yap</span>
                  </button>

                  <p style={{ margin: 0, fontSize: 9.5, color: "#64748b", fontWeight: 700 }}>
                    Personel girişi @halktv.com.tr Google hesabı ile yapılır.
                  </p>
                  {deviceAuthenticated && <button type="button" onClick={() => { setDeviceChatOpen(true); setDeviceChatUnread(0); }} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "9px 10px", border: "1px solid #d9c7cc", borderRadius: 9, background: "#fff8f8", color: "#6f2d42", fontSize: 10.5, fontWeight: 800, cursor: "pointer" }}><HiOutlineChatBubbleLeftRight size={16} /> Giriş yapmadan teknik desteğe yaz {deviceChatUnread > 0 && <span style={{ padding: "2px 6px", borderRadius: 10, background: "#9e2847", color: "#fff", fontSize: 9 }}>{deviceChatUnread}</span>}</button>}
                  {!deviceAuthenticated && <form onSubmit={claimDevicePairing} style={{ display: "grid", gap: 5, padding: 8, borderRadius: 9, background: "#f7f3f4", textAlign: "left" }}><label htmlFor="device-pair-code" style={{ fontSize: 9, fontWeight: 800, color: "#6f3c4a" }}>Girişsiz destek için cihaz eşleştirme kodu</label><div style={{ display: "flex", gap: 5 }}><input id="device-pair-code" value={pairingCode} onChange={(event) => setPairingCode(event.target.value.toUpperCase().replace(/[^A-F0-9]/g, ""))} maxLength={12} placeholder="12 karakterli IT kodu" autoComplete="off" style={{ flex: 1, minWidth: 0, padding: "7px 8px", border: "1px solid #e2cbd2", borderRadius: 7, fontSize: 10, background: "#fff", color: "#4f303b" }} /><button type="submit" disabled={pairingBusy || pairingCode.length !== 12 || hostname === "—"} style={{ border: 0, borderRadius: 7, padding: "6px 8px", background: "#774052", color: "#fff", fontSize: 9, fontWeight: 800, cursor: "pointer" }}>{pairingBusy ? "…" : "Eşleştir"}</button></div>{pairingError && <small role="alert" style={{ color: "#a61b3b", fontSize: 8 }}>{pairingError}</small>}<small style={{ color: "#92777e", fontSize: 8 }}>Kodu IT yönetimi bu bilgisayar için üretir; 15 dakika geçerlidir.</small></form>}
                  <AdminLogin />
                </div>

                <p style={{ margin: "auto 0 0", fontSize: 8.5, color: "#94a3b8" }}>
                  HalkTV Teknik Hizmetler & Bilişim © 2026
                </p>
              </div>
            ) : (
              /* ══════════════════════════════════════════════════════════════
                 OTURUM AÇIK MODU (DOLU & MANTIKLI ANA PANEL)
                 ══════════════════════════════════════════════════════════════ */
              <div style={{ display: "flex", flexDirection: "column", gap: 7, padding: isItStaff ? "12px" : "0" }}>

                {/* 2. Kullanıcı Profil Kartı (Google Avatarlı) */}
                <div style={{
                  background: "#fff",
                  border: 0,
                  borderRadius: 8,
                  padding: "8px 10px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  flexShrink: 0,
                  boxShadow: "0 5px 14px rgba(91,16,33,0.08)",
                }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, width: "100%" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0, flex: 1 }}>
                      {renderAvatar({ ...kioskUser, isOnline: true }, 36, true)}
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <p style={{ margin: 0, fontSize: 11.5, fontWeight: 800, color: "#5b1021", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {kioskUser.name}
                        </p>
                        <p style={{ margin: "1px 0 0", fontSize: 9, color: "#8a6970", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {[kioskUser.title, kioskUser.department?.name].filter(Boolean).join(" · ") || kioskUser.email}
                        </p>
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
                      <button
                        type="button"
                        disabled={isTogglingDm}
                        onClick={handleToggleDm}
                        title={myDmEnabled ? "Mesaj Alımını Kapat (Rahatsız Etmeyin)" : "Mesaj Alımını Aç"}
                        style={{
                          background: myDmEnabled ? "#f0fdf4" : "#fff1f2",
                          border: `1px solid ${myDmEnabled ? "#bbf7d0" : "#fecdd3"}`,
                          color: myDmEnabled ? "#15803d" : "#c8102e",
                          borderRadius: 999,
                          padding: "4px 7px",
                          fontSize: 8.5,
                          fontWeight: 850,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: 3,
                        }}
                      >
                        {myDmEnabled ? <HiOutlineBell size={11} /> : <HiOutlineBellSlash size={11} />}
                        <span>{myDmEnabled ? "Mesaj açık" : "Mesaj Alımı kapalı"}</span>
                      </button>
                      <button
                        onClick={handleKioskLogout}
                        title="Oturumu Kapat"
                        style={{
                          background: "#fff7f8",
                          border: "1px solid #fecdd3",
                          borderRadius: 5,
                          cursor: "pointer",
                          color: "#c8102e",
                          fontSize: 9,
                          fontWeight: 700,
                          padding: "4px 7px",
                          display: "flex",
                          alignItems: "center",
                          gap: 3,
                        }}
                      >
                        <HiOutlineArrowRightOnRectangle size={12} /> Çıkış
                      </button>
                    </div>
                  </div>

                  <div
                    aria-label="Bilgisayar bilgileri"
                    style={{
                      display: "flex",
                      alignItems: "center",
                      width: "100%",
                      minWidth: 0,
                      marginTop: 5,
                      padding: "5px 7px",
                      borderRadius: 7,
                      background: "#f1f3f5",
                      boxShadow: "inset 0 0 0 1px #e1e5e8",
                      color: "#111827",
                      overflow: "hidden",
                    }}
                  >
                    {[
                      ["PC", hostname || "—"],
                      ["IP", liveIp || "Algılanıyor"],
                      ["AnyDesk", anydeskId || (anydeskChecked ? "Kurulu değil" : "Aranıyor…")],
                    ].map(([label, value], index) => (
                      <React.Fragment key={label}>
                        <span style={{ minWidth: 0, flex: 1, display: "flex", flexDirection: "column", gap: 1, overflow: "hidden" }}>
                          <b style={{ fontSize: 7, lineHeight: 1, color: "#6b7280", fontWeight: 800, letterSpacing: 0.35 }}>{label}</b>
                          <code style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 9, lineHeight: 1.15, color: "#111827", fontWeight: 700, fontFamily: '"Segoe UI", sans-serif' }}>{value}</code>
                        </span>
                        {index < 2 && <i style={{ width: 1, height: 22, flex: "0 0 1px", margin: "0 7px", background: "#d3d8dc" }} />}
                      </React.Fragment>
                    ))}
                  </div>
                </div>

                {isItStaff ? (
                  /* ══════════════════════════════════════════════════════════════
                     IT ADMIN COCKPIT
                     ══════════════════════════════════════════════════════════════ */
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
                    {/* Sub-tab Seçici (4 Sekme) */}
                    <div style={{ display: "flex", background: "#f1f5f9", padding: 2, borderRadius: 6, gap: 2, flexShrink: 0 }}>
                      <button
                        onClick={() => setItSubTab("tickets")}
                        style={{ flex: 1, padding: "5px 3px", borderRadius: 5, border: "none", fontSize: 9.5, fontWeight: 700, cursor: "pointer", background: itSubTab === "tickets" ? "#fff" : "transparent", color: itSubTab === "tickets" ? "#0f172a" : "#64748b", boxShadow: itSubTab === "tickets" ? "0 1px 2px rgba(0,0,0,0.05)" : "none" }}
                      >
                        Talepler ({myTickets.filter((t) => !["RESOLVED", "CLOSED", "CANCELLED"].includes(t.status)).length})
                      </button>
                      <button
                        onClick={() => setItSubTab("staff")}
                        style={{ flex: 1, padding: "5px 3px", borderRadius: 5, border: "none", fontSize: 9.5, fontWeight: 700, cursor: "pointer", background: itSubTab === "staff" ? "#fff" : "transparent", color: itSubTab === "staff" ? "#0f172a" : "#64748b", boxShadow: itSubTab === "staff" ? "0 1px 2px rgba(0,0,0,0.05)" : "none" }}
                      >
                        Personel ({staffContacts.length})
                      </button>
                      <button
                        onClick={() => setItSubTab("logs")}
                        style={{ flex: 1, padding: "5px 3px", borderRadius: 5, border: "none", fontSize: 9.5, fontWeight: 700, cursor: "pointer", background: itSubTab === "logs" ? "#fff" : "transparent", color: itSubTab === "logs" ? "#0f172a" : "#64748b", boxShadow: itSubTab === "logs" ? "0 1px 2px rgba(0,0,0,0.05)" : "none" }}
                      >
                        Loglar
                      </button>
                      <button
                        onClick={() => setItSubTab("tools")}
                        style={{ flex: 1, padding: "5px 3px", borderRadius: 5, border: "none", fontSize: 9.5, fontWeight: 700, cursor: "pointer", background: itSubTab === "tools" ? "#fff" : "transparent", color: itSubTab === "tools" ? "#0f172a" : "#64748b", boxShadow: itSubTab === "tools" ? "0 1px 2px rgba(0,0,0,0.05)" : "none" }}
                      >
                        Araçlar
                      </button>
                      <button onClick={() => setItSubTab("notifications")} style={{ flex: 1, border: 0, borderRadius: 5, padding: "5px 3px", fontSize: 9.5, color: "#475569", background: itSubTab === "notifications" ? "#fff" : "transparent", cursor: "pointer" }}>
                        Bildirimler {adminNotifications.some(n => !n.isRead) && <b style={{ borderRadius: 10, padding: "1px 4px", background: "#dbeafe", color: "#1d4ed8" }}>{adminNotifications.filter(n => !n.isRead).length}</b>}
                      </button>
                    </div>

                    {/* SUB-TAB 1: BİLETLER */}
                    {itSubTab === "tickets" && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                        <div style={{ display: "flex", gap: 3 }}>
                          {(["open", "in_progress", "all"] as const).map((filter) => (
                            <button
                              key={filter}
                              onClick={() => setTicketFilter(filter)}
                              style={{
                                padding: "2px 7px",
                                borderRadius: 4,
                                border: "1px solid",
                                fontSize: 8.5,
                                fontWeight: 700,
                                cursor: "pointer",
                                background: ticketFilter === filter ? "#0f172a" : "#fff",
                                color: ticketFilter === filter ? "#fff" : "#475569",
                                borderColor: ticketFilter === filter ? "#0f172a" : "#cbd5e1",
                              }}
                            >
                              {filter === "open" ? "Açık" : filter === "in_progress" ? "İşlemde" : "Tümü"}
                            </button>
                          ))}
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 300, overflowY: "auto" }}>
                          {myTickets
                            .filter((t) => {
                              if (ticketFilter === "open") return t.status === "OPEN";
                              if (ticketFilter === "in_progress") return t.status === "IN_PROGRESS";
                              return true;
                            })
                            .map((ticket) => (
                              <button type="button" onClick={() => { setActiveModal("my-tickets"); void openMyTicket(ticket.id); }}
                                key={ticket.id}
                                style={{
                                  background: "#fff",
                                  border: "1px solid #e2e8f0",
                                  borderRadius: 6,
                                  padding: "6px 8px",
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: 4,
                                }}
                              >
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                  <span style={{ fontSize: 8.5, fontWeight: 800, color: "#c8102e", fontFamily: "monospace" }}>#{ticket.number}</span>
                                  <span style={{ fontSize: 8.5, fontWeight: 700, padding: "1px 5px", borderRadius: 4, background: ticket.status === "OPEN" ? "#fef2f2" : "#eff6ff", color: ticket.status === "OPEN" ? "#991b1b" : "#1e40af" }}>
                                    {STATUS_LABELS[ticket.status as keyof typeof STATUS_LABELS] || "Durum belirtilmemiş"}
                                  </span>
                                </div>
                                <p style={{ margin: 0, fontSize: 10.5, fontWeight: 700, color: "#0f172a" }}>{ticket.title}</p>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 8.5, color: "#64748b" }}>
                                  <span>{ticket.requester?.name || "Personel"}</span>
                                  <span>{new Date(ticket.createdAt).toLocaleDateString("tr-TR")}</span>
                                </div>
                              </button>
                            ))}
                          {myTickets.length === 0 && (
                            <p style={{ margin: 0, fontSize: 10, color: "#94a3b8", textAlign: "center", padding: "12px 0" }}>Kayıtlı talep bulunamadı.</p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* SUB-TAB 2: PERSONEL TAKİP (KATLARA GÖRE KATEGORİZE) */}
                    {itSubTab === "staff" && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        <div style={{ position: "relative" }}>
                          <input
                            type="text"
                            placeholder="Personel, kat veya birim ara..."
                            value={staffSearch}
                            onChange={(e) => setStaffSearch(e.target.value)}
                            style={{ width: "100%", boxSizing: "border-box", padding: "5px 8px 5px 24px", fontSize: 9.5, borderRadius: 5, border: "1px solid #cbd5e1", outline: "none" }}
                          />
                          <HiOutlineMagnifyingGlass size={12} style={{ position: "absolute", left: 7, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
                        </div>

                        <div style={{ display: "flex", flexDirection: "column", gap: 7, maxHeight: 310, overflowY: "auto" }}>
                          {FLOOR_CATEGORIES.map((cat) => {
                            const list = staffByFloor[cat.id] || [];
                            if (list.length === 0) return null;
                            const isCollapsed = collapsedFloors[cat.id];
                            return (
                              <div key={cat.id} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 7, overflow: "hidden" }}>
                                <div
                                  onClick={() => setCollapsedFloors((prev) => ({ ...prev, [cat.id]: !prev[cat.id] }))}
                                  style={{
                                    background: cat.bg,
                                    borderBottom: isCollapsed ? "none" : `1px solid ${cat.border}`,
                                    padding: "5px 8px",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    cursor: "pointer",
                                  }}
                                >
                                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                                    {isCollapsed ? <HiOutlineChevronRight size={11} color={cat.color} /> : <HiOutlineChevronDown size={11} color={cat.color} />}
                                    <span style={{ fontSize: 9.5, fontWeight: 800, color: cat.color }}>{cat.title}</span>
                                  </div>
                                  <span style={{ fontSize: 8.5, fontWeight: 800, background: "#fff", color: cat.color, border: `1px solid ${cat.border}`, padding: "1px 5px", borderRadius: 10 }}>
                                    {list.length} Kişi
                                  </span>
                                </div>

                                {!isCollapsed && (
                                  <div style={{ padding: "4px 6px", display: "flex", flexDirection: "column", gap: 4 }}>
                                    {list.map((staff) => (
                                      <div
                                        key={staff.id}
                                        style={{
                                          padding: "5px 6px",
                                          borderRadius: 5,
                                          background: "#f8fafc",
                                          border: "1px solid #f1f5f9",
                                          display: "flex",
                                          alignItems: "center",
                                          justifyContent: "space-between",
                                          gap: 6,
                                        }}
                                      >
                                        <button type="button" onClick={() => void openStaffDetail(staff.id)} style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0, flex: 1, border: 0, background: "transparent", padding: 0, textAlign: "left", cursor: "pointer" }}>
                                          {renderAvatar(staff, 26, true)}
                                          <div style={{ minWidth: 0, flex: 1 }}>
                                            <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                              {staff.name}
                                            </p>
                                            <p style={{ margin: 0, fontSize: 8.5, color: "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                              {staff.title || staff.department || "HalkTV"}
                                              {staff.computerName && <span style={{ fontFamily: "monospace", color: "#2563eb", marginLeft: 4 }}>({staff.computerName})</span>}
                                            </p>
                                          </div>
                                        </button>

                                        <button
                                          type="button"
                                          onClick={() => {
                                            setChatMode("staff");
                                            setChatPartnerId(staff.id);
                                            setChatPartner(staff);
                                            setActiveTab("chat");
                                          }}
                                          style={{
                                            background: "#eff6ff",
                                            color: "#1d4ed8",
                                            border: "1px solid #bfdbfe",
                                            padding: "3px 6px",
                                            borderRadius: 4,
                                            fontSize: 8.5,
                                            fontWeight: 700,
                                            cursor: "pointer",
                                            flexShrink: 0,
                                          }}
                                        >
                                          Sohbet
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {itSubTab === "logs" && <AdminLogs />}
                    {itSubTab === "notifications" && <AdminNotifications items={adminNotifications} onRead={markAdminNotification} onDelete={deleteAdminNotification} onOpenTicket={(id) => { setActiveModal("my-tickets"); void openMyTicket(id); }} onOpenDevice={openDeviceConversation} />}

                    {/* SUB-TAB 4: ARAÇLAR */}
                    {itSubTab === "tools" && (
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {/* Yayın Bildirisi */}
                        <div style={{ background: "linear-gradient(135deg,#fff7ed,#fff)", borderRadius: 12, padding: "10px", display: "flex", flexDirection: "column", gap: 7, boxShadow: "0 5px 18px rgba(120,53,15,.08)" }}>
                          <div style={{ display: "flex", gap: 8, alignItems: "center" }}><span style={{ width: 28, height: 28, borderRadius: 8, background: "#ffedd5", color: "#c2410c", display: "grid", placeItems: "center" }}><HiOutlineBell size={16}/></span><span><b style={{ display: "block", fontSize: 10, color: "#292524" }}>Acil IT bildirisi</b><small style={{ color: "#78716c", fontSize: 8 }}>Kayıtlı kiosk ekranlarına anında iletilir</small></span></div>
                          <div style={{ display: "flex", gap: 6 }}>
                            <input
                              type="text"
                              placeholder="Bildiri metnini yazın..."
                              value={broadcastMsg}
                              onChange={(e) => setBroadcastMsg(e.target.value)}
                              style={{ flex: 1, padding: "7px 8px", fontSize: 9.5, borderRadius: 8, border: 0, background: "#fff", boxShadow: "inset 0 0 0 1px #fed7aa", outline: "none" }}
                            />
                            <button
                              type="button"
                              disabled={broadcastSending || !broadcastMsg.trim()}
                              onClick={handleSendBroadcast}
                              style={{ background: "#9a3412", color: "#fff", border: "none", borderRadius: 8, padding: "6px 10px", fontSize: 9, fontWeight: 800, cursor: "pointer" }}
                            >
                              {broadcastSending ? "..." : broadcastSent ? "✓" : "Yayınla"}
                            </button>
                          </div>
                        </div>

                        <DeviceDirectory devices={networkComputers} onRefresh={loadComputers} onConnect={handleLaunchVnc} onCommand={handleDeviceCommand} focusDeviceId={focusedDeviceId} visible={kioskVisible} canTakeover={["SUPER_ADMIN", "TEKNIK_MUDUR", "TEKNIK_YONETMEN"].includes(kioskUser?.role || "")} />

                        {/* Hızlı Onarım */}
                        <div style={{ background: "#fff", borderRadius: 12, padding: 9, boxShadow: "0 5px 18px rgba(15,23,42,.06)" }}><small style={{ display: "block", color: "#64748b", fontSize: 8, fontWeight: 800, marginBottom: 6 }}>BU BİLGİSAYARDA HIZLI ONARIM</small><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                          <button
                            type="button"
                            onClick={() => { const ipc = getIpc(); if (ipc) ipc.send("kiosk-flush-dns"); }}
                            style={{ background: "#f1f5f9", color: "#334155", border: 0, padding: "8px", borderRadius: 8, fontSize: 9, fontWeight: 750, cursor: "pointer", textAlign: "left" }}
                          >
                            ⚡ DNS Önbelleği Temizle
                          </button>
                          <button
                            type="button"
                            onClick={() => { const ipc = getIpc(); if (ipc) ipc.send("kiosk-reset-spooler"); }}
                            style={{ background: "#f1f5f9", color: "#334155", border: 0, padding: "8px", borderRadius: 8, fontSize: 9, fontWeight: 750, cursor: "pointer", textAlign: "left" }}
                          >
                            🖨️ Yazıcı Servisi Sıfırla
                          </button>
                        </div></div>
                      </div>
                    )}
                  </div>
                ) : (
                  <EmployeeHome support={itContacts} announcements={announcements}
                     staffUnread={chatUnreadStaff}
                     sharedFolderCount={sharedFoldersList.length}
                    onChat={openChat}
                    onAction={(action) => {
                      if (action === "marsis") {
                        openMarsis();
                        return;
                      }
                      if (action === "remote") {
                        const ipc = getIpc();
                        if (ipc) ipc.send("open-anydesk");
                        else setActiveModal("remote");
                        return;
                      }
                      setActiveModal(action);
                      if (action === "my-tickets") loadTickets();
                    }} />
                )}
              </div>
            )}
          </div>
        ) : (
         <ChatWorkspace mode={chatMode} contacts={chatMode === "it" ? itContacts : staffContacts}
            partner={chatPartnerId ? chatPartner : null} messages={messages} input={chatInput}
            sending={isSendingChat} error={chatSendError} dmEnabled={myDmEnabled} dmBusy={isTogglingDm}
            attachment={chatAttachment} partnerTyping={partnerTyping}
            hasOlder={hasOlderMessages} loadingOlder={loadingOlderMessages} onLoadOlder={loadOlderMessages}
            supportOverride={isItStaff}
             onToggleDm={handleToggleDm} onInput={setChatInput} onSend={handleSendInChat}
             onChatAction={handleChatAction} onAttach={handleAttachChatFile} onRemoveAttachment={() => setChatAttachment(null)}
            onMode={openChat} onPerson={(p) => openPerson(p, chatMode)}
            onBack={() => { setChatPartnerId(null); setChatPartner(null); setMessages([]); setChatAttachment(null); setPartnerTyping(false); }} />
        )}

        {staffDetail && <div onMouseDown={(e) => { if (e.target === e.currentTarget) setStaffDetail(null); }} style={{ position: "fixed", inset: "55px 8px 58px", zIndex: 130, background: "rgba(20,28,36,.28)", borderRadius: 13, display: "flex", alignItems: "center", justifyContent: "center", padding: 10 }}>
          <section style={{ width: "100%", maxHeight: "100%", overflowY: "auto", background: "#f5f7f8", borderRadius: 13, boxShadow: "0 18px 45px rgba(15,23,42,.24)" }}>
            <header style={{ position: "sticky", top: 0, zIndex: 2, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 10px", background: "rgba(255,255,255,.96)", borderBottom: "1px solid #e6e9ec" }}><strong style={{ fontSize: 11, color: "#26313d" }}>Personel ayrıntısı</strong><button onClick={() => setStaffDetail(null)} style={{ border: 0, background: "#eef1f4", width: 25, height: 25, borderRadius: 7, display: "grid", placeItems: "center", color: "#596572" }}><HiOutlineXMark size={15}/></button></header>
            {staffDetailLoading ? <p style={{ textAlign: "center", padding: 30, color: "#718096", fontSize: 10 }}>Personel bilgileri yükleniyor…</p> : staffDetailError ? <p role="alert" style={{ margin: 10, padding: 10, borderRadius: 8, background: "#fff0f2", color: "#a0102b", fontSize: 9 }}>{staffDetailError}</p> : <div style={{ padding: 10, display: "flex", flexDirection: "column", gap: 9 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#fff", borderRadius: 11, padding: 10 }}>
                {renderAvatar(staffDetail, 44, true)}<div style={{ minWidth: 0 }}><strong style={{ display: "block", color: "#1f2937", fontSize: 12 }}>{staffDetail.name || "Personel"}</strong><span style={{ display: "block", color: "#52606d", fontSize: 9 }}>{staffDetail.title || "Ünvan belirtilmemiş"}</span><small style={{ color: "#7b8794", fontSize: 8 }}>{[staffDetail.department?.floor, staffDetail.department?.name].filter(Boolean).join(" · ") || "Birim belirtilmemiş"}</small></div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>{[["E-posta",staffDetail.email],["Telefon",staffDetail.phone],["Sicil",staffDetail.employeeNo],["Son giriş",staffDetail.lastLoginAt ? new Date(staffDetail.lastLoginAt).toLocaleString("tr-TR") : null]].map(([label,value]) => <div key={label} style={{ background: "#fff", borderRadius: 9, padding: 8 }}><small style={{ display: "block", color: "#89939e", fontSize: 7.5, fontWeight: 800 }}>{label}</small><span style={{ display: "block", color: "#344150", fontSize: 8.7, overflowWrap: "anywhere" }}>{value || "Bilgi yok"}</span></div>)}</div>
              <div><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}><strong style={{ color: "#334155", fontSize: 10 }}>Zimmetli bilgisayarlar</strong><span style={{ padding: "2px 6px", borderRadius: 99, background: "#e8eef5", color: "#536475", fontSize: 8, fontWeight: 800 }}>{staffDetail.computers?.length || 0}</span></div>
                {staffDetail.computers?.length ? staffDetail.computers.map((computer: any) => <article key={computer.id} style={{ background: "#fff", borderRadius: 10, padding: 9, marginBottom: 6, boxShadow: "0 3px 10px rgba(15,23,42,.05)" }}><div style={{ display: "flex", justifyContent: "space-between", gap: 7 }}><div><strong style={{ display: "block", fontSize: 10, color: "#26313d" }}>{computer.name}</strong><small style={{ color: computer.isOnline ? "#168451" : "#7b8794", fontSize: 8 }}>{computer.isOnline ? "● Çevrimiçi" : "● Çevrimdışı"}</small></div><button disabled={!computer.ip} onClick={() => computer.ip && handleLaunchVnc(computer.ip)} style={{ border: 0, borderRadius: 7, background: "#e8f1ff", color: "#285ea5", padding: "5px 7px", fontSize: 8, fontWeight: 800 }}>Bağlan</button></div><div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 8px", marginTop: 7 }}>{[["IP",computer.ip],["Windows",computer.windowsUser],["Sistem",computer.os],["İşlemci",computer.cpu],["Bellek",computer.ram],["Disk",computer.disk],["Ekran",computer.screenCount],["Son görülme",computer.lastSeen]].map(([label,value]) => <span key={label} style={{ minWidth: 0, color: "#586574", fontSize: 7.8, overflowWrap: "anywhere" }}><b style={{ color: "#87919b" }}>{label}:</b> {value || "—"}</span>)}</div></article>) : <p style={{ margin: 0, background: "#fff", borderRadius: 9, padding: 12, color: "#7b8794", textAlign: "center", fontSize: 9 }}>Bu personele zimmetlenmiş bilgisayar bulunmuyor.</p>}
              </div>
              <div><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}><strong style={{ color: "#334155", fontSize: 10 }}>Diğer demirbaşlar</strong><span style={{ padding: "2px 6px", borderRadius: 99, background: "#e8eef5", color: "#536475", fontSize: 8, fontWeight: 800 }}>{staffDetail.assetAssignments?.filter((a:any) => !a.returnedAt).length || 0}</span></div>
                {staffDetail.assetAssignments?.filter((a:any) => !a.returnedAt).length ? staffDetail.assetAssignments.filter((a:any) => !a.returnedAt).map((assignment:any) => <article key={assignment.id} style={{ background: "#fff", borderRadius: 10, padding: 9, marginBottom: 6 }}><strong style={{ display: "block", color: "#26313d", fontSize: 9.5 }}>{assignment.asset.type} · {assignment.asset.brand || ""} {assignment.asset.model || ""}</strong><div style={{ marginTop: 4, color: "#667483", fontSize: 8 }}>Demirbaş: {assignment.asset.assetTag} · Seri: {assignment.asset.serialNumber || "—"}</div><small style={{ color: "#87919b", fontSize: 7.5 }}>Teslim: {new Date(assignment.assignedAt).toLocaleDateString("tr-TR")} · Konum: {assignment.asset.location || "—"}</small></article>) : <p style={{ margin: 0, background: "#fff", borderRadius: 9, padding: 12, color: "#7b8794", textAlign: "center", fontSize: 9 }}>Aktif demirbaş zimmeti bulunmuyor.</p>}
              </div>
            </div>}
          </section>
        </div>}

        {kioskUser && <WorkspaceNav tab={activeTab} mode={chatMode} unread={chatUnreadStaff}
          admin={isItStaff} onHome={() => setActiveTab("dashboard")} onChat={openChat} />}

        {activeToast && (
          <div className={workspaceStyles.topToast} style={{ position: "fixed", left: 10, right: 10, top: 56, zIndex: 120, background: "#ffffff", color: "#263238", border: 0, borderRadius: 12, boxShadow: "0 10px 28px rgba(25,45,35,0.18)", padding: "10px 11px", display: "flex", gap: 9, alignItems: "flex-start" }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", overflow: "hidden", background: "#edf8f1", color: "#238b53", display: "grid", placeItems: "center", fontWeight: 900, flexShrink: 0 }}>
              {activeToast.avatar ? <img src={activeToast.avatar} alt="" referrerPolicy="no-referrer" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <img src="/halktv-logo.png" alt="HalkTV" style={{ width: "70%", height: "70%", objectFit: "contain" }} />}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <strong style={{ fontSize: 12, color: "#1f3328", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{activeToast.title}</strong>
                <span style={{ fontSize: 9, opacity: 0.7, flexShrink: 0 }}>{activeToast.time}</span>
              </div>
              {activeToast.subtitle && <div style={{ fontSize: 9.5, color: "#6d7c74", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{activeToast.subtitle}</div>}
              <p style={{ margin: "6px 0 0", fontSize: 11, lineHeight: 1.4, color: "#33443b" }}>{activeToast.message}</p>
              {activeToast.type === "chat" && <button type="button" onClick={() => { const list = activeToast.chatMode === "it" ? itContacts : staffContacts; const person = list.find((p) => p.id === activeToast.partnerId); if (person) { setChatMode(activeToast.chatMode || "staff"); setChatPartnerId(person.id); setChatPartner(person); setMessages([]); setActiveTab("chat"); } setActiveToast(null); }} style={{ marginTop: 7, border: 0, borderRadius: 7, padding: "5px 8px", background: "#eaf6ef", color: "#28734a", fontSize: 9, fontWeight: 800, cursor: "pointer" }}>Sohbete git</button>}
              {activeToast.deviceChat && <button type="button" onClick={() => { if (activeToast.deviceChatComputerId) openDeviceConversation(activeToast.deviceChatComputerId); else { setActiveTab("dashboard"); setDeviceChatOpen(true); setDeviceChatUnread(0); } setActiveToast(null); }} style={{ marginTop: 7, border: 0, borderRadius: 7, padding: "5px 8px", background: "#f7e8ed", color: "#772c43", fontSize: 9, fontWeight: 800, cursor: "pointer" }}>Cihaz sohbetini aç</button>}
            </div>
            <button type="button" onClick={closeActiveToast} style={{ border: 0, background: "transparent", color: "inherit", cursor: "pointer", padding: 0, opacity: 0.75 }}>
              <HiOutlineXMark size={16} />
            </button>
          </div>
        )}

        {pendingChatAction && (
          <div
            onMouseDown={(e) => { if (e.target === e.currentTarget) setPendingChatAction(null); }}
            style={{ position: "fixed", inset: 0, zIndex: 160, display: "grid", placeItems: "center", padding: 16, background: "rgba(15, 23, 42, 0.34)", backdropFilter: "blur(2px)" }}
          >
            <div
              onMouseDown={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              style={{ width: "100%", maxWidth: 302, background: "#fff", borderRadius: 12, boxShadow: "0 18px 42px rgba(15,23,42,.24)", padding: 14, color: "#17212b" }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: 13, lineHeight: 1.25, fontWeight: 850 }}>{pendingChatAction.title}</h2>
                  <p style={{ margin: "6px 0 0", fontSize: 10.5, lineHeight: 1.45, color: "#64748b" }}>{pendingChatAction.message}</p>
                </div>
                <button type="button" onClick={() => setPendingChatAction(null)} aria-label="Kapat" style={{ border: 0, background: "#f1f5f9", color: "#475569", width: 24, height: 24, borderRadius: 7, display: "grid", placeItems: "center", cursor: "pointer", flexShrink: 0 }}>
                  <HiOutlineXMark size={15} />
                </button>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 7, marginTop: 13 }}>
                <button type="button" onClick={() => setPendingChatAction(null)} style={{ border: "1px solid #e2e8f0", background: "#fff", color: "#475569", borderRadius: 8, padding: "7px 10px", fontSize: 10, fontWeight: 800, cursor: "pointer" }}>
                  Vazgeç
                </button>
                <button type="button" onClick={() => { const next = pendingChatAction; setPendingChatAction(null); void runChatAction(next.action); }} style={{ border: 0, background: pendingChatAction.danger ? "#b91c1c" : "#111827", color: "#fff", borderRadius: 8, padding: "7px 10px", fontSize: 10, fontWeight: 850, cursor: "pointer" }}>
                  {pendingChatAction.confirmText}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════
           NATIVE MODALLAR (SIFIR IFRAME)
           ══════════════════════════════════════════════════════════════ */}

        {/* 1. KATLARA GÖRE PERSONEL REHBERİ MODALI */}
        {activeModal === "personnel-directory" && (
          <div onMouseDown={(e) => { if (e.target === e.currentTarget) setActiveModal(null); }} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.6)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 12 }}>
            <div onMouseDown={(e) => e.stopPropagation()} style={{ background: "#fff", width: "100%", maxHeight: "92%", borderRadius: 10, display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 10px 25px rgba(0,0,0,0.2)" }}>
              <div style={{ background: "#f8fafc", padding: "10px 12px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #e2e8f0" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <HiOutlineUserGroup size={16} color="#7c3aed" />
                  <span style={{ fontSize: 12, fontWeight: 800, color: "#0f172a" }}>HalkTV Personel & Kat Rehberi</span>
                </div>
                <button onClick={() => setActiveModal(null)} style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }}>
                  <HiOutlineXMark size={18} color="#64748b" />
                </button>
              </div>

              <div style={{ padding: "8px 10px", borderBottom: "1px solid #e2e8f0" }}>
                <div style={{ position: "relative" }}>
                  <input
                    type="text"
                    placeholder="Personel adı, birim, kat veya unvan ara..."
                    value={staffSearch}
                    onChange={(e) => setStaffSearch(e.target.value)}
                    style={{ width: "100%", boxSizing: "border-box", padding: "6px 8px 6px 26px", fontSize: 10, borderRadius: 5, border: "1px solid #cbd5e1", outline: "none" }}
                  />
                  <HiOutlineMagnifyingGlass size={13} style={{ position: "absolute", left: 8, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
                </div>
              </div>

              <div style={{ padding: 8, display: "flex", flexDirection: "column", gap: 7, overflowY: "auto", flex: 1 }}>
                {FLOOR_CATEGORIES.map((cat) => {
                  const list = staffByFloor[cat.id] || [];
                  if (list.length === 0) return null;
                  const isCollapsed = collapsedFloors[cat.id];
                  return (
                    <div key={cat.id} style={{ background: "#fff", border: "1px solid #e2e8f0", borderRadius: 7, overflow: "hidden" }}>
                      <div
                        onClick={() => setCollapsedFloors((prev) => ({ ...prev, [cat.id]: !prev[cat.id] }))}
                        style={{
                          background: cat.bg,
                          borderBottom: isCollapsed ? "none" : `1px solid ${cat.border}`,
                          padding: "6px 9px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          cursor: "pointer",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                          {isCollapsed ? <HiOutlineChevronRight size={12} color={cat.color} /> : <HiOutlineChevronDown size={12} color={cat.color} />}
                          <span style={{ fontSize: 10, fontWeight: 800, color: cat.color }}>{cat.title}</span>
                        </div>
                        <span style={{ fontSize: 8.5, fontWeight: 800, background: "#fff", color: cat.color, border: `1px solid ${cat.border}`, padding: "1px 6px", borderRadius: 10 }}>
                          {list.length} Personel
                        </span>
                      </div>

                      {!isCollapsed && (
                        <div style={{ padding: "5px 6px", display: "flex", flexDirection: "column", gap: 4 }}>
                          {list.map((staff) => (
                            <div
                              key={staff.id}
                              style={{
                                padding: "6px 8px",
                                borderRadius: 6,
                                background: "#f8fafc",
                                border: "1px solid #f1f5f9",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: 7,
                              }}
                            >
                              <button type="button" onClick={() => void openStaffDetail(staff.id)} style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0, flex: 1, border: 0, background: "transparent", padding: 0, textAlign: "left", cursor: "pointer" }}>
                                {renderAvatar(staff, 30, true)}
                                <div style={{ minWidth: 0, flex: 1 }}>
                                  <p style={{ margin: 0, fontSize: 10.5, fontWeight: 800, color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                    {staff.name}
                                  </p>
                                  <p style={{ margin: 0, fontSize: 8.5, color: "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                    {staff.title || staff.department || "HalkTV Personeli"}
                                    {staff.computerName && (
                                      <span style={{ color: "#2563eb", fontFamily: "monospace", marginLeft: 4 }}>
                                        • {staff.computerName}
                                      </span>
                                    )}
                                  </p>
                                </div>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setActiveModal(null);
                                  setChatMode("staff");
                                  setChatPartnerId(staff.id);
                                  setChatPartner(staff);
                                  setActiveTab("chat");
                                }}
                                style={{
                                  background: "#eff6ff",
                                  color: "#1d4ed8",
                                  border: "1px solid #bfdbfe",
                                  padding: "4px 8px",
                                  borderRadius: 5,
                                  fontSize: 9,
                                  fontWeight: 800,
                                  cursor: "pointer",
                                  flexShrink: 0,
                                }}
                              >
                                Sohbet
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* 2. ORTAK KLASÖRLER MODALI */}
        {activeModal === "shared-folders" && (
          <div onMouseDown={(e) => { if (e.target === e.currentTarget) setActiveModal(null); }} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.6)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 12 }}>
            <div onMouseDown={(e) => e.stopPropagation()} style={{ background: "#fff", width: "100%", maxHeight: "90%", borderRadius: 10, display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 10px 25px rgba(0,0,0,0.2)" }}>
              <div style={{ background: "#f8fafc", padding: "10px 12px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #e2e8f0" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <HiOutlineFolder size={16} color="#15803d" />
                  <span style={{ fontSize: 12, fontWeight: 800, color: "#5b1021" }}>Ortak Klasörler ({sharedFoldersList.length} Ağ Alanı)</span>
                </div>
                <button onClick={() => setActiveModal(null)} style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }}>
                  <HiOutlineXMark size={18} color="#64748b" />
                </button>
              </div>

              <div style={{ padding: 10, display: "flex", flexDirection: "column", gap: 6, overflowY: "auto" }}>
                {sharedFoldersList.map((folder, idx) => (
                  <div key={idx} style={{ background: "#fff", border: "1px solid #eadde0", padding: "9px 11px", borderRadius: 7, display: "flex", flexDirection: "column", gap: 5, boxShadow: "0 1px 3px rgba(91,16,33,0.04)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 11, fontWeight: 800, color: "#5b1021", display: "inline-flex", alignItems: "center", gap: 7 }}>
                        <span style={{ position: "relative", display: "inline-grid", placeItems: "center", width: 23, height: 23, borderRadius: 7, background: "#f5f0df", color: "#9a7622" }}>
                          <HiOutlineFolder size={15} />
                          <span style={{ position: "absolute", top: -6, right: -7, minWidth: 15, height: 15, padding: "0 3px", display: "grid", placeItems: "center", borderRadius: 99, background: "#9a7622", color: "#fff", fontSize: 7, fontWeight: 900 }}>{typeof folder.fileCount === "number" ? folder.fileCount : "…"}</span>
                        </span> {folder.name}
                      </span>
                      <span style={{ fontSize: 8.5, color: folder.fileCount === null ? "#a16207" : "#c8102e", fontWeight: 850, background: folder.fileCount === null ? "#fffbeb" : "#fff1f3", border: `1px solid ${folder.fileCount === null ? "#fde68a" : "#fecdd3"}`, padding: "2px 6px", borderRadius: 999 }}>
                        {typeof folder.fileCount === "number" ? `${folder.fileCount} dosya` : folder.fileCount === null ? "Sayılamadı" : "Sayılıyor"}
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: 8.5, color: "#8a6970" }}>{folder.desc}</p>
                    <div style={{ background: "#fff7f8", padding: "4px 6px", borderRadius: 4, border: "1px dashed #efc7cd", fontSize: 9, fontFamily: "monospace", color: "#5b1021" }}>
                      {folder.path}
                    </div>
                    <div style={{ display: "flex", gap: 5, marginTop: 2 }}>
                      <button
                        type="button"
                        onClick={() => handleOpenPath(folder.path)}
                        style={{ flex: 1, background: "#15803d", color: "#fff", border: "none", padding: "5px", borderRadius: 4, fontSize: 9, fontWeight: 700, cursor: "pointer" }}
                      >
                        Klasörü Aç
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleCopyPath(folder.path, e)}
                        style={{ flex: 1, background: copiedPath === folder.path ? "#16a34a" : "#fff", color: copiedPath === folder.path ? "#fff" : "#475569", border: "1px solid #cbd5e1", padding: "5px", borderRadius: 4, fontSize: 9, fontWeight: 700, cursor: "pointer" }}
                      >
                        {copiedPath === folder.path ? "✓ Kopyalandı" : "Yolu Kopyala"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 3. YENİ TALEP OLUŞTURMA MODALI */}
        {activeModal === "new-ticket" && (
          <div onMouseDown={(e) => { if (e.target === e.currentTarget) setActiveModal(null); }} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.6)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 12 }}>
            <div onMouseDown={(e) => e.stopPropagation()} style={{ background: "#fff", width: "100%", maxHeight: "92%", borderRadius: 10, display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 10px 25px rgba(0,0,0,0.2)" }}>
              <div style={{ background: "#f8fafc", padding: "10px 12px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #e2e8f0" }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: "#0f172a" }}>Yeni Teknik Talep Oluştur</span>
                <button onClick={() => setActiveModal(null)} style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }}>
                  <HiOutlineXMark size={18} color="#64748b" />
                </button>
              </div>

              <form onSubmit={handleCreateTicket} style={{ padding: "10px 12px", display: "flex", flexDirection: "column", gap: 7, overflowY: "auto", flex: 1 }}>
                <div>
                  <label style={{ display: "block", fontSize: 9, fontWeight: 700, color: "#475569", marginBottom: 2 }}>Talep Başlığı</label>
                  <input
                    type="text"
                    placeholder="ör: Monitör açılmıyor, Marsis yayını dondu..."
                    value={newTicketTitle}
                    onChange={(e) => setNewTicketTitle(e.target.value)}
                    style={{ width: "100%", boxSizing: "border-box", padding: "6px 8px", fontSize: 10.5, borderRadius: 5, border: "1px solid #cbd5e1", outline: "none" }}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 9, fontWeight: 700, color: "#475569", marginBottom: 2 }}>Kategori</label>
                    <select
                      value={newTicketCategory}
                      onChange={(e) => setNewTicketCategory(e.target.value)}
                      style={{ width: "100%", padding: "5px", fontSize: 10, borderRadius: 5, border: "1px solid #cbd5e1", background: "#fff" }}
                    >
                      <option value="HARDWARE">Donanım & Kasa</option>
                      <option value="SOFTWARE">Yazılım & Program</option>
                      <option value="NETWORK">İnternet & Ağ</option>
                      <option value="EMAIL">E-Posta & Hesap</option>
                      <option value="OTHER">Diğer Talepler</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 9, fontWeight: 700, color: "#475569", marginBottom: 2 }}>Öncelik</label>
                    <select
                      value={newTicketPriority}
                      onChange={(e) => setNewTicketPriority(e.target.value)}
                      style={{ width: "100%", padding: "5px", fontSize: 10, borderRadius: 5, border: "1px solid #cbd5e1", background: "#fff" }}
                    >
                      <option value="LOW">Düşük</option>
                      <option value="MEDIUM">Normal</option>
                      <option value="HIGH">Yüksek (Acil)</option>
                      <option value="URGENT">Kritik (Yayın Riski)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 9, fontWeight: 700, color: "#475569", marginBottom: 2 }}>Detaylı Açıklama</label>
                  <textarea
                    rows={3}
                    placeholder="Yaşadığınız sorunu detaylıca açıklayınız..."
                    value={newTicketDescription}
                    onChange={(e) => setNewTicketDescription(e.target.value)}
                    style={{ width: "100%", boxSizing: "border-box", padding: "6px 8px", fontSize: 10.5, borderRadius: 5, border: "1px solid #cbd5e1", outline: "none", resize: "none" }}
                  />
                </div>

                <label style={{ display: "flex", alignItems: "center", gap: 7, padding: "7px 8px", borderRadius: 7, background: "#f4f6f8", color: "#475569", fontSize: 9, fontWeight: 700, cursor: "pointer" }}>
                  <HiOutlinePaperClip size={15} />
                  <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{newTicketAttachment ? newTicketAttachment.name : "Ekran görüntüsü veya dosya ekle (en fazla 50 MB)"}</span>
                  <input type="file" hidden onChange={(e) => { const file = e.target.files?.[0] || null; try { if (file) validateTicketFile(file); setNewTicketAttachment(file); setNewTicketError(""); } catch (error) { setNewTicketAttachment(null); setNewTicketError(error instanceof Error ? error.message : "Dosya seçilemedi."); } e.currentTarget.value = ""; }} />
                  {newTicketAttachment && <button type="button" onClick={(e) => { e.preventDefault(); setNewTicketAttachment(null); }} style={{ border: 0, background: "transparent", color: "#9f3348", cursor: "pointer", padding: 0 }}><HiOutlineXMark size={15} /></button>}
                </label>

                {newTicketError && (
                  <div style={{ fontSize: 9, color: "#b91c1c", background: "#fef2f2", padding: "4px 6px", borderRadius: 4 }}>
                    {newTicketError}
                  </div>
                )}
                {newTicketSuccess && (
                  <div style={{ fontSize: 9.5, color: "#15803d", background: "#f0fdf4", padding: "5px 8px", borderRadius: 4, fontWeight: 800 }}>
                    ✓ Talep #{newTicketSuccess} oluşturuldu!
                  </div>
                )}

                <button
                  type="submit"
                  disabled={newTicketSubmitting}
                  style={{
                    marginTop: 4,
                    background: "#c8102e",
                    color: "#fff",
                    border: "none",
                    padding: "8px",
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: 800,
                    cursor: newTicketSubmitting ? "not-allowed" : "pointer",
                  }}
                >
                  {newTicketSubmitting ? "İletiliyor..." : "Talebi Gönder"}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* 4. TALEPLERİM MODALI */}
        {activeModal === "my-tickets" && (
          <div onMouseDown={(e) => { if (e.target === e.currentTarget) setActiveModal(null); }} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.6)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 12 }}>
            <div onMouseDown={(e) => e.stopPropagation()} style={{ background: "#fff", width: "100%", maxHeight: "90%", borderRadius: 10, display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 10px 25px rgba(0,0,0,0.2)" }}>
              <div style={{ background: "#f8fafc", padding: "10px 12px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #e2e8f0" }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: "#5b1021" }}>{myTicketDetail ? `Talep #${myTicketDetail.number}` : `${isItStaff ? "Tüm talepler" : "Taleplerim"} (${myTickets.length})`}</span>
                <button onClick={() => setActiveModal(null)} style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }}>
                  <HiOutlineXMark size={18} color="#64748b" />
                </button>
              </div>

              <div style={{ padding: 8, display: "flex", flexDirection: "column", gap: 5, overflowY: "auto", flex: 1 }}>
                {myTicketDetail ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                    <button type="button" onClick={() => setMyTicketDetail(null)} style={{ alignSelf: "flex-start", border: 0, background: "#f7efe8", color: "#7b3f4d", borderRadius: 7, padding: "6px 9px", fontSize: 9, fontWeight: 800 }}>← Taleplerime dön</button>
                    <div style={{ background: "#fff8f6", borderRadius: 10, padding: 11, boxShadow: "0 4px 12px rgba(91,16,33,.08)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "flex-start" }}><div><small style={{ color: "#a27d85", fontSize: 8, fontWeight: 800 }}>TALEP BAŞLIĞI</small><strong style={{ display: "block", color: "#5b1021", fontSize: 12, marginTop: 2 }}>{myTicketDetail.title}</strong></div><span style={{ color: "#28734a", background: "#eaf6ef", borderRadius: 99, padding: "4px 7px", fontSize: 8.5, fontWeight: 800 }}>{TICKET_STATUS_LABELS[myTicketDetail.status] || "Durum belirtilmemiş"}</span></div>
                      {isItStaff && myTicketDetail.requester && <div style={{ marginTop: 8, padding: "7px 8px", borderRadius: 7, background: "#fff", display: "grid", gap: 2 }}><b style={{ fontSize: 9.5, color: "#334155" }}>{myTicketDetail.requester.name || "Talep sahibi"}</b><span style={{ fontSize: 8.5, color: "#64748b" }}>{[myTicketDetail.requester.title, myTicketDetail.requester.department?.floor, myTicketDetail.requester.department?.name].filter(Boolean).join(" · ") || "Birim bilgisi yok"}</span><span style={{ fontSize: 8.5, color: "#64748b" }}>{[myTicketDetail.requester.email, myTicketDetail.requester.phone].filter(Boolean).join(" · ")}</span></div>}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5, margin: "10px 0" }}><div style={{ background: "#fff", borderRadius: 7, padding: "5px 7px" }}><small style={{ display: "block", color: "#a27d85", fontSize: 7.5, fontWeight: 800 }}>KATEGORİ</small><span style={{ fontSize: 9.5, color: "#604d51", fontWeight: 700 }}>{({ HARDWARE: "Donanım", SOFTWARE: "Yazılım", NETWORK: "Ağ", EMAIL: "E-posta", ACCOUNT_ACCESS: "Hesap / erişim", OTHER: "Diğer" } as any)[myTicketDetail.category] || "Genel destek"}</span></div><div style={{ background: "#fff", borderRadius: 7, padding: "5px 7px" }}><small style={{ display: "block", color: "#a27d85", fontSize: 7.5, fontWeight: 800 }}>ÖNCELİK</small><span style={{ fontSize: 9.5, color: "#604d51", fontWeight: 700 }}>{({ LOW: "Düşük", MEDIUM: "Orta", HIGH: "Yüksek", URGENT: "Acil" } as any)[myTicketDetail.priority] || "Orta"}</span></div></div>
                      <small style={{ display: "block", color: "#a27d85", fontSize: 8, marginBottom: 4 }}>SORUN AÇIKLAMASI</small><p style={{ color: "#795965", fontSize: 10, lineHeight: 1.5, whiteSpace: "pre-wrap", margin: 0 }}>{myTicketDetail.description}</p>
                      {(myTicketDetail.computerName || myTicketDetail.computerIp || myTicketDetail.anydeskId) && <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 9 }}>{[["Bilgisayar", myTicketDetail.computerName], ["IP", myTicketDetail.computerIp], ["AnyDesk", myTicketDetail.anydeskId]].filter(([,v]) => v).map(([k,v]) => <span key={k} style={{ background: "#f2f4f5", borderRadius: 5, padding: "4px 6px", color: "#607078", fontSize: 8.5 }}><b>{k}:</b> {v}</span>)}</div>}
                      <small style={{ display: "block", color: "#a27d85", marginTop: 9 }}>Oluşturulma: {new Date(myTicketDetail.createdAt).toLocaleString("tr-TR")}</small>
                      {myTicketDetail.attachments?.length > 0 && <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 5 }}>{myTicketDetail.attachments.map((attachment: any) => <a key={attachment.id} href={attachment.storagePath} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "5px 7px", borderRadius: 6, background: "#eef2f6", color: "#435466", fontSize: 8.5, fontWeight: 700, textDecoration: "none" }}><HiOutlinePaperClip size={12} />{attachment.fileName}</a>)}</div>}
                    </div>
                    {isItStaff && <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 5 }}>
                      {Object.entries(TICKET_STATUS_LABELS).map(([status, label]) => <button key={status} type="button" disabled={isSendingTicketReply || myTicketDetail.status === status} onClick={() => void handleTicketStatus(status)} style={{ border: 0, borderRadius: 7, padding: "7px", background: myTicketDetail.status === status ? "#dcefe5" : "#eef2f6", color: myTicketDetail.status === status ? "#28734a" : "#475569", fontSize: 8.5, fontWeight: 800, cursor: myTicketDetail.status === status ? "default" : "pointer" }}>{label}</button>)}
                    </div>}
                    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                      <small style={{ color: "#8f747b", fontSize: 8, fontWeight: 800 }}>YANITLAR · {myTicketDetail.comments?.length || 0}</small>
                      {myTicketDetail.comments?.length ? myTicketDetail.comments.map((c: any) => { const isITReply = ["SUPER_ADMIN", "TEKNIK_MUDUR", "TEKNIK_YONETMEN", "IT_AGENT"].includes(c.author?.role); return <div key={c.id} style={{ alignSelf: isITReply ? "flex-end" : "flex-start", width: "88%", background: isITReply ? "#eaf2ff" : "#fff7ed", borderRadius: isITReply ? "12px 12px 4px 12px" : "12px 12px 12px 4px", padding: "9px 10px", boxShadow: isITReply ? "0 3px 12px rgba(37,99,235,.10)" : "0 3px 12px rgba(180,83,9,.09)", fontFamily: isITReply ? "Segoe UI, sans-serif" : "Inter, Segoe UI, sans-serif" }}><div style={{ display: "flex", justifyContent: "space-between", gap: 6 }}><div><small style={{ display: "block", color: isITReply ? "#2563eb" : "#b45309", fontSize: 7.5, fontWeight: 900, letterSpacing: ".04em" }}>{isITReply ? "YÖNETİCİ / TEKNİK EKİP" : "PERSONEL"}</small><strong style={{ color: isITReply ? "#1e3a8a" : "#78350f", fontSize: isITReply ? 9.5 : 9 }}>{c.author?.name || "Teknik ekip"}</strong><small style={{ display: "block", color: isITReply ? "#5572a7" : "#9a6a38", fontSize: 7.5 }}>{c.author?.title || "Ünvan belirtilmemiş"}</small></div><small style={{ color: "#88939d", fontSize: 7.2, whiteSpace: "nowrap" }}>{new Date(c.createdAt).toLocaleString("tr-TR")}</small></div><p style={{ margin: "6px 0 0", fontSize: isITReply ? 10.2 : 10, fontWeight: isITReply ? 550 : 400, color: isITReply ? "#263b60" : "#5f4632", whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{c.body}</p>{c.attachments?.map((attachment: any) => <a key={attachment.id} href={attachment.storagePath} target="_blank" rel="noreferrer" style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 4, color: isITReply ? "#1d4ed8" : "#9a5b15", fontSize: 8.5, fontWeight: 700, textDecoration: "none" }}><HiOutlinePaperClip size={12} />{attachment.fileName}</a>)}</div>; }) : <p style={{ margin: 0, color: "#a27d85", fontSize: 9 }}>Henüz yanıt yazılmadı.</p>}
                    </div>
                    {ticketError && <p role="alert" style={{ margin: 0, padding: 7, borderRadius: 7, background: "#fcebec", color: "#ab3647", fontSize: 9 }}>{ticketError}</p>}
                    {!['RESOLVED', 'CLOSED', 'CANCELLED'].includes(myTicketDetail.status) && <form onSubmit={handleTicketReply} style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 5, alignItems: "end", marginTop: 3 }}><label title="Dosya ekle" style={{ width: 31, height: 31, borderRadius: 8, background: ticketReplyAttachment ? "#e8f1ff" : "#f4f5f6", color: ticketReplyAttachment ? "#2563eb" : "#65717d", display: "grid", placeItems: "center", cursor: "pointer" }}><HiOutlinePaperClip size={15} /><input type="file" hidden onChange={(e) => { const file = e.target.files?.[0] || null; try { if (file) validateTicketFile(file); setTicketReplyAttachment(file); setTicketError(""); } catch (error) { setTicketReplyAttachment(null); setTicketError(error instanceof Error ? error.message : "Dosya seçilemedi."); } e.currentTarget.value = ""; }} /></label><div><textarea value={ticketReplyText} onChange={(e) => setTicketReplyText(e.target.value)} maxLength={10000} rows={2} placeholder={isItStaff ? "Talep sahibine yanıt yazın…" : "Bu talep hakkında ek bilgi yazın…"} style={{ width: "100%", boxSizing: "border-box", resize: "none", border: 0, borderRadius: 8, background: "#f4f5f6", padding: "7px 8px", fontSize: 9.5, color: "#473a3f", outline: "none" }} />{ticketReplyAttachment && <small style={{ display: "flex", justifyContent: "space-between", gap: 5, color: "#506277", fontSize: 7.5, marginTop: 2 }}><span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ticketReplyAttachment.name}</span><button type="button" onClick={() => setTicketReplyAttachment(null)} style={{ border: 0, background: "none", color: "#a83247", cursor: "pointer" }}>Kaldır</button></small>}</div><button type="submit" disabled={isSendingTicketReply || (!ticketReplyText.trim() && !ticketReplyAttachment)} style={{ border: 0, borderRadius: 8, padding: "8px 9px", background: "#5b1021", color: "#fff", fontSize: 8.5, fontWeight: 800, cursor: "pointer" }}>{isSendingTicketReply ? "…" : "Yanıtla"}</button></form>}
                  </div>
                ) : myTicketDetailLoading || ticketsLoading ? (
                  <p style={{ textAlign: "center", color: "#94a3b8", fontSize: 11 }}>Yükleniyor...</p>
                ) : myTickets.length === 0 ? (
                  <p style={{ textAlign: "center", color: "#94a3b8", fontSize: 11, padding: "20px 0" }}>Henüz bir talebiniz bulunmuyor.</p>
                ) : (
                  myTickets.map((t) => (
                    <button type="button" key={t.id} onClick={() => openMyTicket(t.id)} style={{ width: "100%", textAlign: "left", background: "#fffaf8", border: 0, padding: "9px 10px", borderRadius: 9, cursor: "pointer", boxShadow: "0 3px 10px rgba(91,16,33,.07)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 8.5, fontWeight: 800, color: "#c8102e", fontFamily: "monospace" }}>#{t.number}</span>
                        <span style={{ fontSize: 8, fontWeight: 800, padding: "1px 5px", borderRadius: 3, background: t.status === "RESOLVED" ? "#dcfce7" : "#eff6ff", color: t.status === "RESOLVED" ? "#15803d" : "#1d4ed8" }}>
                          {TICKET_STATUS_LABELS[t.status] || t.status}
                        </span>
                      </div>
                      <p style={{ margin: "4px 0 0", fontSize: 10.5, fontWeight: 700, color: "#5b1021" }}>{t.title}</p>
                      <small style={{ display: "block", marginTop: 5, color: "#8f747b", fontSize: 8.5 }}>{TICKET_CATEGORY_LABELS[t.category] || "Genel destek"} · {TICKET_PRIORITY_LABELS[t.priority] || "Orta"} · {t._count?.comments || 0} yanıt · Güncelleme: {new Date(t.updatedAt || t.createdAt).toLocaleDateString("tr-TR")}</small>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* 5. REMOTE / ANYDESK MODALI */}
        {activeModal === "remote" && (
          <div onMouseDown={(e) => { if (e.target === e.currentTarget) setActiveModal(null); }} style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.6)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 12 }}>
            <div onMouseDown={(e) => e.stopPropagation()} style={{ background: "#fff", width: "100%", borderRadius: 10, display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 10px 25px rgba(0,0,0,0.2)" }}>
              <div style={{ background: "#f8fafc", padding: "10px 12px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #e2e8f0" }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: "#0f172a" }}>AnyDesk Uzaktan Destek</span>
                <button onClick={() => setActiveModal(null)} style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }}>
                  <HiOutlineXMark size={18} color="#64748b" />
                </button>
              </div>

              <div style={{ padding: 14, display: "flex", flexDirection: "column", alignItems: "center", gap: 10, textAlign: "center" }}>
                <img src="/anydesk-logo.svg" alt="AnyDesk" style={{ width: 36, height: 36 }} />
                <div>
                  <span style={{ fontSize: 9, color: "#64748b", fontWeight: 700, textTransform: "uppercase" }}>Bu Bilgisayarın AnyDesk Adresi</span>
                  <p style={{ margin: "2px 0 0", fontSize: 18, fontWeight: 900, color: "#b91c1c", fontFamily: "monospace", letterSpacing: "0.05em" }}>
                    {anydeskId || "Algılanamadı"}
                  </p>
                </div>

                <div style={{ display: "flex", gap: 6, width: "100%" }}>
                  {anydeskId && (
                    <button
                      type="button"
                      onClick={handleCopyAnydesk}
                      style={{ flex: 1, background: anydeskCopied ? "#16a34a" : "#fff", color: anydeskCopied ? "#fff" : "#b91c1c", border: "1px solid #fecdd3", padding: "8px", borderRadius: 6, fontSize: 10.5, fontWeight: 700, cursor: "pointer" }}
                    >
                      {anydeskCopied ? "✓ Kopyalandı" : "Adresi Kopyala"}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      const ipc = getIpc();
                      if (ipc) ipc.send("open-anydesk");
                      else window.open("anydesk:", "_blank");
                    }}
                    style={{ flex: 1, background: "#c8102e", color: "#fff", border: "none", padding: "8px", borderRadius: 6, fontSize: 10.5, fontWeight: 700, cursor: "pointer" }}
                  >
                    AnyDesk Uygulamasını Aç
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </>
  );
}

export default function KioskClient({ currentUser: _currentUser }: { currentUser: unknown }) {
  return (
    <Suspense fallback={
      <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f8fafc", color: "#94a3b8", fontSize: 13 }}>
        Yükleniyor...
      </div>
    }>
      <KioskUI />
    </Suspense>
  );
}
