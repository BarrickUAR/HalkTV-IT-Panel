"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { HiOutlineChatBubbleLeftRight, HiOutlineWrenchScrewdriver, HiOutlineTicket, HiOutlineFolder, HiOutlineGlobeAlt, HiOutlineComputerDesktop, HiOutlineChevronRight, HiOutlineArrowLeft, HiOutlineMagnifyingGlass, HiOutlineHome, HiOutlinePaperAirplane, HiOutlineBell, HiOutlineBellSlash, HiOutlineArchiveBox, HiOutlineTrash, HiOutlineNoSymbol, HiOutlinePaperClip, HiOutlineDocument, HiOutlineArrowDownTray } from "react-icons/hi2";
import s from "./workspace.module.css";
import { DeviceConversation } from "./device-conversation";

export interface Person {
  id: string; name: string | null; image: string | null; role: string;
  title?: string | null; department?: string | null; floor?: string | null; isOnline?: boolean;
  unread?: number; directMessagesEnabled?: boolean; lastSeenText?: string; isArchived?: boolean; isBlocked?: boolean;
  lastMessage?: { body: string; createdAt: string; isMine: boolean } | null; isBlockedBy?: boolean;
}
interface Message { id: string; body: string; fromMe: boolean; createdAt: string; isRead?: boolean; attachmentUrl?: string | null; attachmentName?: string | null; attachmentType?: string | null; }
interface Announcement { id: string; title: string; body?: string | null; level?: string | null; }
interface PendingAttachment { file: File; preview?: string; kind: "image" | "file"; }

function MessageState({ message }: { message: Message }) {
  if (!message.fromMe) return null;
  if (message.id.startsWith("temp-")) return <span className={s.readState}>Gönderiliyor</span>;
  if (message.isRead) return <span className={`${s.readState} ${s.read}`}>✓✓ Görüldü</span>;
  return <span className={s.readState}>✓ Gönderildi</span>;
}

function Avatar({ person }: { person: Person }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [person.image]);
  return <span className={s.avatar}>
    {person.image && !failed ? <img src={person.image.includes("googleusercontent.com") ? `/api/avatar/${encodeURIComponent(person.id)}` : person.image} alt="" referrerPolicy="no-referrer" onError={() => setFailed(true)} /> : <img src="/halktv-logo.png" alt="HalkTV" />}
    {person.isOnline !== undefined && <span className={`${s.online} ${!person.isOnline ? s.offline : ""}`} aria-label={person.isOnline ? "Çevrimiçi" : "Çevrimdışı"} />}
  </span>;
}
function PersonRow({ person, onOpen }: { person: Person; onOpen: (p: Person) => void }) {
  const messageTime = person.lastMessage?.createdAt ? new Date(person.lastMessage.createdAt).toLocaleString("tr-TR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : null;
  return <button className={s.person} onClick={() => onOpen(person)}>
    <Avatar person={person} /><span className={s.personText}><strong>{person.name || "Personel"}</strong>
      <small>{person.lastMessage?.body || "Henüz mesaj yok"}</small><em>{[person.title, person.department, messageTime].filter(Boolean).join(" · ")}</em>
    </span>{!!person.unread && <span className={s.badge}>{person.unread}</span>}
  </button>;
}

export function EmployeeHome({ support, announcements, staffUnread, sharedFolderCount, onChat, onAction }: {
  support: Person[]; announcements?: Announcement[]; staffUnread: number; sharedFolderCount?: number;
  onChat: (mode: "it" | "staff") => void;
  onAction: (action: "new-ticket" | "my-tickets" | "marsis" | "remote" | "shared-folders") => void;
}) {
  return <div className={`${s.workspace} ${s.home}`}>
    <button className={s.support} onClick={() => onChat("it")}>
      <span className={s.supportIcon}><HiOutlineWrenchScrewdriver size={20} /></span><span style={{flex:1}}><strong>Teknik destek</strong><small>Ekibe doğrudan mesaj gönder</small></span><span className={s.supportArrow}><HiOutlineChevronRight size={16} /></span>
    </button>
    <div className={s.homeSectionHead}><h2 className={s.sectionTitle}>Günlük araçlar</h2><span>{sharedFolderCount ?? 0} ağ klasörü</span></div>
    <section className={s.quickGrid}>
      <button className={`${s.quickCard} ${s.quickMarsis}`} onClick={() => onAction("marsis")}><span className={s.toolLogo}><img src="/marsis-logo.svg" alt="" /></span><span><strong>Marsis</strong><small>Haber ağı</small></span><HiOutlineChevronRight size={14} /></button>
      <button className={`${s.quickCard} ${s.quickAnyDesk}`} onClick={() => onAction("remote")}><span className={s.toolLogo}><img src="/anydesk-logo.svg" alt="" /></span><span><strong>AnyDesk</strong><small>Uzaktan bağlantı</small></span><HiOutlineChevronRight size={14} /></button>
      <button className={`${s.quickCard} ${s.quickFolders}`} onClick={() => onAction("shared-folders")}><span className={s.toolLogo}><HiOutlineFolder size={19} /><b className={s.toolCount}>{sharedFolderCount ?? 0}</b></span><span><strong>Ortak klasörler</strong><small>Dosya alanları</small></span><HiOutlineChevronRight size={14} /></button>
      <button className={`${s.quickCard} ${s.quickTickets}`} onClick={() => onAction("my-tickets")}><span className={s.toolLogo}><HiOutlineTicket size={19} /></span><span><strong>Taleplerim</strong><small>Durum takibi</small></span><HiOutlineChevronRight size={14} /></button>
    </section>
    <div className={s.homeBottomRow}><button className={s.bottomAction} onClick={() => onChat("staff")}><HiOutlineChatBubbleLeftRight size={17} /><span>Sohbetler</span>{staffUnread > 0 && <b className={s.badge}>{staffUnread}</b>}</button><button className={s.bottomAction} onClick={() => onAction("new-ticket")}><HiOutlineTicket size={17} /><span>Yeni talep</span><HiOutlineChevronRight size={14} /></button></div>
    {!!announcements?.length && <div className={s.announcement}><strong>{announcements[0].title}</strong><span>{announcements[0].body || "Güncel duyuru"}</span></div>}
  </div>;
}

export function WorkspaceNav({ tab, mode, unread, admin, onHome, onChat }: { tab: string; mode: "it" | "staff"; unread: number; admin: boolean; onHome: () => void; onChat: (mode: "it" | "staff") => void }) {
  return <nav className={`${s.workspace} ${s.nav}`} aria-label="Kiosk gezinme">
    <button onClick={onHome} aria-current={tab === "dashboard" ? "page" : undefined}><HiOutlineHome size={20} />{admin ? "Yönetim" : "Ana sayfa"}</button>
    <button onClick={() => onChat("staff")} aria-current={tab === "chat" && mode === "staff" ? "page" : undefined}><HiOutlineChatBubbleLeftRight size={20} />Sohbetler{unread > 0 && <span className={s.badge} style={{position:"absolute",right:12,top:3}}>{unread}</span>}</button>
    <button onClick={() => onChat("it")} aria-current={tab === "chat" && mode === "it" ? "page" : undefined}><HiOutlineWrenchScrewdriver size={20} />{admin ? "Teknik ekip" : "Destek"}</button>
  </nav>;
}

export function ChatWorkspace({ mode, contacts, partner, messages, input, sending, error, dmEnabled, dmBusy, attachment, partnerTyping, supportOverride, hasOlder, loadingOlder, onLoadOlder, onToggleDm, onMode, onPerson, onBack, onInput, onSend, onChatAction, onAttach, onRemoveAttachment }: {
  mode: "it" | "staff"; contacts: Person[]; partner: Person | null; messages: Message[]; input: string; sending: boolean; error: string;
  dmEnabled: boolean; dmBusy: boolean; attachment?: PendingAttachment | null; partnerTyping?: boolean; supportOverride?: boolean; hasOlder?: boolean; loadingOlder?: boolean; onLoadOlder?: () => void; onToggleDm: () => void;
  onMode: (m: "it" | "staff") => void; onPerson: (p: Person) => void; onBack: () => void; onInput: (s: string) => void; onSend: (e: FormEvent) => void; onChatAction?: (action: "block" | "clear" | "archive" | "unarchive") => void; onAttach?: (file: File) => void; onRemoveAttachment?: () => void;
}) {
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState("all");
  const [showArchived, setShowArchived] = useState(false);
  const scroll = useRef<HTMLDivElement>(null);
  const nearBottom = useRef(true);
  const previousPartner = useRef<string | null>(null);
  const lastId = messages.at(-1)?.id;
  useEffect(() => {
    if (previousPartner.current !== partner?.id) nearBottom.current = true;
    previousPartner.current = partner?.id || null;
    if (scroll.current && nearBottom.current) scroll.current.scrollTop = scroll.current.scrollHeight;
  }, [lastId, partner?.id]);
  const groups = useMemo(() => {
    const map = new Map<string, { floor: string; department: string; label: string }>();
    for (const person of contacts) {
      const floor = (person.floor || "Kat belirtilmemiş").trim();
      const department = (person.department || "Departman belirtilmemiş").trim();
      const key = `${floor}|||${department}`;
      if (!map.has(key)) map.set(key, { floor, department, label: `${floor} / ${department}` });
    }
    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label, "tr-TR"));
  }, [contacts]);
  const filtered = contacts.filter(p => {
    const textOk = [p.name,p.title,p.department,p.floor].filter(Boolean).join(" ").toLocaleLowerCase("tr-TR").includes(query.toLocaleLowerCase("tr-TR"));
    const groupOk = group === "all" || `${p.floor || "Kat belirtilmemiş"}|||${p.department || "Departman belirtilmemiş"}` === group;
    return textOk && groupOk && Boolean(p.isArchived) === showArchived;
  }).sort((a, b) => {
    if (Boolean(a.isOnline) !== Boolean(b.isOnline)) return a.isOnline ? -1 : 1;
    const at = a.lastMessage ? Date.parse(a.lastMessage.createdAt) : 0;
    const bt = b.lastMessage ? Date.parse(b.lastMessage.createdAt) : 0;
    return bt - at;
  });
  return <section className={`${s.workspace} ${s.chat}`} aria-label={mode === "it" ? "Teknik destek" : "Personel sohbetleri"}>
    <header className={s.chatHeader}>{partner ? <div className={s.between}><div className={s.row}><button className={s.iconButton} onClick={onBack} aria-label="Kişilere dön"><HiOutlineArrowLeft size={20} /></button><Avatar person={partner} /><div className={s.personText}><strong>{partner.name}</strong><small>{partnerTyping ? <span className={s.typingInline}>yazıyor<span>.</span><span>.</span><span>.</span></span> : `${partner.title || partner.department || "HalkTV"} · ${partner.isOnline ? "Çevrimiçi" : "Çevrimdışı"}`}</small></div></div><div className={s.chatActions}><button title={partner.isArchived ? "Arşivden çıkar" : "Sohbeti arşivle"} onClick={() => onChatAction?.(partner.isArchived ? "unarchive" : "archive")}><HiOutlineArchiveBox size={16}/></button><button title="Sohbeti temizle" onClick={() => onChatAction?.("clear")}><HiOutlineTrash size={16}/></button><button title={partner.isBlocked ? "Engeli kaldır" : "Kişiyi engelle"} onClick={() => onChatAction?.("block")}><HiOutlineNoSymbol size={16}/></button></div></div> : <>
      <div className={s.between}><div><p className={s.eyebrow}>İletişim</p><h1 className={s.heading}>{mode === "it" ? "Teknik destek" : "Sohbetler"}</h1></div><button type="button" className={s.dnd} disabled={dmBusy} aria-pressed={!dmEnabled} onClick={onToggleDm}>{dmEnabled ? <HiOutlineBell size={15}/> : <HiOutlineBellSlash size={15}/>}<span>{dmEnabled ? "Mesaj Alımı açık" : "Mesaj Alımı kapalı"}</span></button></div>
      <div className={s.segments}><button aria-pressed={mode === "staff"} onClick={() => {setQuery(""); setGroup("all"); onMode("staff");}}>Personel</button><button aria-pressed={mode === "it"} onClick={() => {setQuery(""); setGroup("all"); onMode("it");}}>Teknik destek</button></div>
      <button type="button" className={s.archiveToggle} aria-pressed={showArchived} onClick={() => setShowArchived(value => !value)}><HiOutlineArchiveBox size={14}/>{showArchived ? "Aktif sohbetlere dön" : "Arşivlenen sohbetler"}</button>
      {groups.length > 0 && <div className={s.chips}><button aria-pressed={group === "all"} onClick={() => setGroup("all")}>Tümü</button>{groups.map(g => <button key={`${g.floor}-${g.department}`} aria-pressed={group === `${g.floor}|||${g.department}`} onClick={() => setGroup(`${g.floor}|||${g.department}`)}>{g.label}</button>)}</div>}
      <label className={s.search}><HiOutlineMagnifyingGlass size={18} /><input aria-label="Kişi veya birim ara" placeholder="Kişi veya birim ara" value={query} onChange={e => setQuery(e.target.value)} /></label>
    </>}</header>
    {!partner ? <div className={s.scroll}>{filtered.length ? <div className={s.list} style={{marginTop:0}}>{filtered.map(p => <PersonRow key={p.id} person={p} onOpen={onPerson} />)}</div> : <p className={s.empty}>{query ? "Aramanıza uygun kişi bulunamadı." : "Şu anda listelenecek kişi yok."}</p>}</div> : <>
      <div ref={scroll} className={s.scroll} onScroll={() => {if(scroll.current) nearBottom.current = scroll.current.scrollHeight - scroll.current.scrollTop - scroll.current.clientHeight < 70;}}>
        {hasOlder && <button type="button" className={s.link} disabled={loadingOlder} onClick={onLoadOlder} style={{display:"block",margin:"2px auto 8px"}}>{loadingOlder ? "Yükleniyor…" : "Daha eski mesajları göster"}</button>}
        {!messages.length && <p className={s.empty}>Sohbetiniz burada görünecek.</p>}
        {messages.map(m => <article key={m.id} className={`${s.bubble} ${m.fromMe ? s.mine : ""}`}>
          {m.body && <p>{m.body}</p>}
          {m.attachmentUrl && m.attachmentType === "image" && <a className={s.messageImage} href={m.attachmentUrl.startsWith("data:") ? undefined : m.attachmentUrl} target="_blank" rel="noreferrer"><img src={m.attachmentUrl} alt={m.attachmentName || "Görsel"} /></a>}
          {m.attachmentUrl && m.attachmentType !== "image" && <a className={s.messageFile} href={m.attachmentUrl} target="_blank" rel="noreferrer" download={m.attachmentName || true}><HiOutlineDocument size={15} /><span>{m.attachmentName || "Dosya"}</span><HiOutlineArrowDownTray size={14} /></a>}
          <small>{new Date(m.createdAt).toLocaleTimeString("tr-TR",{hour:"2-digit",minute:"2-digit"})}<MessageState message={m} /></small>
        </article>)}
       </div><div className={s.composer}>{error && <p className={s.error} role="alert">{error}</p>}{partner.directMessagesEnabled === false && !supportOverride && mode !== "it" ? <p className={s.muted}>Bu kişi mesaj alımını kapattı.</p> : mode === "staff" && !partner.isOnline && !supportOverride ? <p className={s.muted}>Bu kişi şu anda çevrimdışı. Çevrimiçi olduğunda mesaj gönderebilirsiniz.</p> : <>
        {attachment && <div className={s.attachmentPreview}>{attachment.kind === "image" && attachment.preview ? <img src={attachment.preview} alt="" /> : <HiOutlineDocument size={18} />}<span>{attachment.file.name}</span><button type="button" onClick={onRemoveAttachment} aria-label="Eki kaldır">×</button></div>}
        <form onSubmit={onSend}><label className={s.attach} title="Dosya ekle (en fazla 50 MB)"><HiOutlinePaperClip size={17}/><input type="file" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.json,.zip,.rar,.7z,.mp3,.wav,.mp4,.mov,.avi" hidden onChange={e => { const f = e.target.files?.[0]; if (f) onAttach?.(f); e.currentTarget.value = ""; }} /></label><textarea rows={1} value={input} onChange={e => onInput(e.target.value)} aria-label="Mesajınız" placeholder="Mesajınızı yazın" onKeyDown={e => {if(e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing){e.preventDefault();e.currentTarget.form?.requestSubmit();}}} /><button className={s.send} disabled={sending || (!input.trim() && !attachment)} aria-label="Mesajı gönder"><HiOutlinePaperAirplane size={20} /></button></form>
       </>}</div>
    </>}
  </section>;
}

export interface Device { id: string; name: string; ip?: string | null; winUser?: string | null; department?: string | null; user?: {name?: string | null; title?: string | null; email?: string | null} | null; cpu?: string | null; ram?: string | null; disk?: string | null; os?: string | null; gpu?: string | null; networkSpeed?: string | null; screenCount?: string | null; uptime?: string | null; lastSeen?: string | null; isOnline?: boolean; domain?: string | null; organizationalUnit?: string | null; inventorySource?: string; kioskInstalled?: boolean; kioskVersion?: string | null; anyDeskId?: string | null; tightVncAvailable?: boolean; vncReachable?: boolean; deviceIdentityActive?: boolean; deviceChatUnread?: number; lastVncConnectedAt?: string | null; }
export function DeviceDirectory({ devices, onRefresh, onConnect, onCommand, focusDeviceId, visible = true, canTakeover = false }: { devices: Device[]; onRefresh: () => void; onConnect: (device: Device) => void; onCommand?: (name: string, type: string) => Promise<void>; focusDeviceId?: string | null; visible?: boolean; canTakeover?: boolean }) {
  const [query,setQuery] = useState("");
  const [openDevice, setOpenDevice] = useState<string | null>(null);
  const [chatDevice, setChatDevice] = useState<string | null>(null);
  const [pairingCodes, setPairingCodes] = useState<Record<string, { code?: string; error?: string; expiresAt?: string }>>({});
  const [manualPairingName, setManualPairingName] = useState("");
  const [lastManualPairingName, setLastManualPairingName] = useState("");
  const [commandState, setCommandState] = useState<Record<string, string>>({});
  const appliedFocus = useRef<string | null>(null);
  useEffect(() => {
    if (!focusDeviceId) { appliedFocus.current = null; return; }
    if (appliedFocus.current === focusDeviceId || !devices.some((device) => device.id === focusDeviceId)) return;
    appliedFocus.current = focusDeviceId;
    setOpenDevice(focusDeviceId);
    setChatDevice(focusDeviceId);
    const timer = window.setTimeout(() => document.getElementById(`device-${focusDeviceId}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 100);
    return () => window.clearTimeout(timer);
  }, [focusDeviceId, devices]);
  const filtered = devices.filter(d => [d.name,d.ip,d.winUser,d.user?.name,d.department].join(" ").toLocaleLowerCase("tr-TR").includes(query.toLocaleLowerCase("tr-TR")));
  const online = devices.filter(d => d.isOnline).length;
  async function command(name: string, type: string) {
    if (!onCommand || commandState[name] === "Gönderiliyor…") return;
    setCommandState(v => ({...v, [name]: "Gönderiliyor…"}));
    try { await onCommand(name, type); setCommandState(v => ({...v, [name]: "Komut gönderildi"})); }
    catch { setCommandState(v => ({...v, [name]: "Komut gönderilemedi"})); }
  }
  async function createPairing(name: string) {
    setPairingCodes((current) => ({ ...current, [name]: { error: "Kod üretiliyor…" } }));
    try {
      const response = await fetch("/api/device-pairing", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "create", hostname: name }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Kod üretilemedi.");
      setPairingCodes((current) => ({ ...current, [name]: { code: data.code, expiresAt: data.expiresAt } }));
    } catch (error) { setPairingCodes((current) => ({ ...current, [name]: { error: error instanceof Error ? error.message : "Kod üretilemedi." } })); }
  }
  return <section className={s.workspace} style={{background:"#fff",borderRadius:12,padding:10,boxShadow:"0 5px 18px rgba(15,23,42,.06)"}}><div className={s.between}><div><h2 className={s.sectionTitle}>Kiosk kayıtlı cihazlar</h2><small style={{color:"#64748b",fontSize:8}}>{online} çevrimiçi · {devices.length} kayıtlı</small></div><button className={s.link} onClick={onRefresh}>Yenile</button></div><p style={{margin:"5px 0 7px",color:"#64748b",fontSize:8,lineHeight:1.35}}>Bu liste kioskun bağlantı kurduğu cihazları gösterir. Etki alanındaki tüm bilgisayarlar için Active Directory senkronizasyonu gerekir.</p><form onSubmit={(event) => { event.preventDefault(); const name = manualPairingName.trim().toUpperCase(); setLastManualPairingName(name); void createPairing(name); }} style={{display:"flex",gap:5,margin:"6px 0"}}><input aria-label="Yeni bilgisayar adı" placeholder="Yeni PC adı" value={manualPairingName} onChange={event=>setManualPairingName(event.target.value.toUpperCase())} maxLength={120} style={{flex:1,minWidth:0,border:"1px solid #e7d5db",borderRadius:7,padding:"6px 7px",fontSize:9,color:"#50343d"}}/><button type="submit" disabled={!/^[A-Z0-9._-]{2,120}$/.test(manualPairingName.trim())} style={{border:0,borderRadius:7,background:"#75384b",color:"#fff",padding:"6px 8px",fontSize:8.5,fontWeight:800,cursor:"pointer"}}>Yeni cihazı eşleştir</button></form>{lastManualPairingName && pairingCodes[lastManualPairingName]?.code && <p className={s.commandState}>Kod: <strong style={{fontFamily:"monospace",letterSpacing:1}}>{pairingCodes[lastManualPairingName].code}</strong> · Cihaz: {lastManualPairingName} · 15 dakika geçerli</p>}{lastManualPairingName && pairingCodes[lastManualPairingName]?.error && <p className={s.commandState}>{pairingCodes[lastManualPairingName].error}</p>}<label className={s.search}><HiOutlineMagnifyingGlass size={18}/><input aria-label="Bilgisayar ara" placeholder="Ad, personel veya IP ara" value={query} onChange={e=>setQuery(e.target.value)}/></label>
    {!filtered.length && <p className={s.empty}>Gösterilecek cihaz bulunamadı.</p>}
    {!!filtered.length && <div className={s.deviceList}>
      {filtered.map(d => { const expanded = openDevice === d.id; return <article id={`device-${d.id}`} key={d.id} className={`${s.deviceCard} ${expanded ? s.deviceCardOpen : ""}`}>
        <button type="button" className={s.deviceSummary} aria-expanded={expanded} onClick={() => {
          const next = expanded ? null : d.id;
          setOpenDevice(next);
          if (next) window.setTimeout(() => document.getElementById(`device-${d.id}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" }), 80);
        }}>
          <span className={`${s.deviceDot} ${d.isOnline || d.vncReachable ? s.deviceOnline : ""}`} />
          <span className={s.deviceIdentity}><strong>{d.name}{Boolean(d.deviceChatUnread) && <em style={{ marginLeft: 5, padding: "1px 4px", borderRadius: 7, background: "#9e2847", color: "#fff", fontSize: 8, fontStyle: "normal" }}>{d.deviceChatUnread}</em>}</strong><small>{d.user?.name || d.winUser || "Kullanıcı bilgisi yok"}</small></span>
          <span className={s.deviceAddress}><b>{d.ip || "IP bilinmiyor"}</b><small>{d.isOnline ? "Kiosk çevrimiçi" : d.vncReachable ? "VNC erişilebilir" : d.kioskInstalled === false ? "Kiosk kurulmamış" : "Çevrimdışı"}</small></span>
          <HiOutlineChevronRight className={s.deviceChevron} size={15}/>
        </button>
        {expanded && <div className={s.deviceBody}>
          <dl>{Object.entries({Personel:d.user?.name,Ünvan:d.user?.title,"E-posta":d.user?.email,Birim:d.department,Windows:d.winUser,IP:d.ip,Domain:d.domain,AnyDesk:d.anyDeskId,Sistem:d.os,İşlemci:d.cpu,Bellek:d.ram,Disk:d.disk,Grafik:d.gpu,Ağ:d.networkSpeed,Ekran:d.screenCount,"Kiosk sürümü":d.kioskVersion,"Cihaz kimliği":d.deviceIdentityActive ? "Etkin" : "Eski / eksik",TightVNC:d.vncReachable ? "Ağdan erişilebilir" : d.tightVncAvailable ? "Kurulu" : "Algılanmadı","Son VNC bağlantısı":d.lastVncConnectedAt ? new Date(d.lastVncConnectedAt).toLocaleString("tr-TR") : null,"Açık süre":d.uptime,"Son heartbeat":d.lastSeen}).map(([k,v])=><div key={k} style={{display:"contents"}}><dt>{k}</dt><dd>{v || "Bilgi yok"}</dd></div>)}</dl>
          {!d.kioskInstalled && <p className={s.commandState}>Bu cihazdan ayrıntılı bilgi almak için HalkTV Kiosk kurulmalıdır. VNC erişimi yalnızca bağlantı durumunu gösterir.</p>}
          <div className={s.deviceActions}><button disabled={!d.ip} onClick={()=> d.ip && onConnect(d)}>TightVNC ile bağlan</button><button disabled={!d.deviceIdentityActive} onClick={()=>setChatDevice(chatDevice === d.id ? null : d.id)}>Cihaza mesaj / sohbet</button>{!d.deviceIdentityActive && <button onClick={() => void createPairing(d.name)}>Eşleştirme kodu üret</button>}{onCommand && <><button disabled={!d.isOnline} onClick={()=>void command(d.name,"RELOAD_KIOSK")}>Kiosku yenile</button><button disabled={!d.isOnline} onClick={()=>void command(d.name,"FLUSH_DNS")}>DNS temizle</button><button disabled={!d.isOnline} onClick={()=>void command(d.name,"RESET_SPOOLER")}>Yazıcı servisi</button></>}</div>
          {pairingCodes[d.name]?.code && <p className={s.commandState}>Bu bilgisayarda girilecek tek kullanımlık kod: <strong style={{fontFamily:"monospace",fontSize:12,letterSpacing:1}}>{pairingCodes[d.name].code}</strong> · {new Date(pairingCodes[d.name].expiresAt!).toLocaleTimeString("tr-TR",{hour:"2-digit",minute:"2-digit"})} saatine kadar geçerli. Kodu yalnızca ilgili cihazdaki kişiye iletin.</p>}
          {pairingCodes[d.name]?.error && <p className={s.commandState}>{pairingCodes[d.name].error}</p>}
          {chatDevice === d.id && <DeviceConversation computerId={d.id} visible={visible} canTakeover={canTakeover} onClose={() => setChatDevice(null)} />}
          {commandState[d.name] && <p className={s.commandState}>{commandState[d.name]}</p>}
        </div>}
      </article>; })}
    </div>}
  </section>;
}
