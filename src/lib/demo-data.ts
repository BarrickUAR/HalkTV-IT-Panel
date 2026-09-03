/**
 * Demo modu için sahte veri seti.
 * DEMO_MODE=true olduğunda Prisma yerine bu veriler kullanılır.
 */

import type {
  TicketStatus,
  TicketPriority,
  TicketCategory,
  Role,
  UserStatus,
} from "@prisma/client";

// ─── Kullanıcılar ────────────────────────────────────────────────────────────

export const DEMO_USERS = [
  {
    id: "demo-it-1",
    name: "Berk Yılmaz",
    email: "berk.yilmaz@halktv.com.tr",
    image: null,
    role: "IT_MANAGER" as Role,
    status: "ACTIVE" as UserStatus,
    title: "IT Müdürü",
    phone: "0212 555 01 01",
    employeeNo: "IT001",
    username: "berk",
    passwordHash: null,
    department: "Teknik",
    computerName: "IT-MGR-01",
    managerId: null,
    createdAt: new Date("2024-01-10"),
    updatedAt: new Date("2026-08-01"),
  },
  {
    id: "demo-it-2",
    name: "Selin Aksoy",
    email: "selin.aksoy@halktv.com.tr",
    image: null,
    role: "IT_AGENT" as Role,
    status: "ACTIVE" as UserStatus,
    title: "Sistem Uzmanı",
    phone: "0212 555 01 02",
    employeeNo: "IT002",
    username: "selin",
    passwordHash: null,
    department: "Teknik",
    computerName: "IT-SYS-02",
    managerId: "demo-it-1",
    createdAt: new Date("2024-03-15"),
    updatedAt: new Date("2026-07-20"),
  },
  {
    id: "demo-emp-1",
    name: "Ahmet Çelik",
    email: "ahmet.celik@halktv.com.tr",
    image: null,
    role: "EMPLOYEE" as Role,
    status: "ACTIVE" as UserStatus,
    title: "Muhabir",
    phone: "0212 555 02 01",
    employeeNo: "EMP101",
    username: "ahmet",
    passwordHash: null,
    department: "Haber Kanalı",
    computerName: "HABER-PC-01",
    managerId: null,
    createdAt: new Date("2023-06-01"),
    updatedAt: new Date("2026-06-15"),
  },
  {
    id: "demo-emp-2",
    name: "Fatma Demir",
    email: "fatma.demir@halktv.com.tr",
    image: null,
    role: "EMPLOYEE" as Role,
    status: "ACTIVE" as UserStatus,
    title: "Editör",
    phone: "0212 555 02 02",
    employeeNo: "EMP102",
    username: "fatma",
    passwordHash: null,
    department: "Haber Kanalı",
    computerName: "REJI-EDITOR",
    managerId: null,
    createdAt: new Date("2022-09-01"),
    updatedAt: new Date("2026-05-10"),
  },
];

// ─── Ticket'lar ───────────────────────────────────────────────────────────────

export const DEMO_TICKETS = [
  {
    id: "ticket-1",
    number: "HTV-2026-000001",
    title: "Yazıcı bağlantı sorunu — Haber Masası",
    description:
      "3. kattaki Haber Masası'ndaki Canon yazıcısı ağa bağlanamıyor. Sarı ışık yanıp sönüyor. Dün beri sorun devam ediyor.",
    category: "HARDWARE" as TicketCategory,
    priority: "HIGH" as TicketPriority,
    status: "IN_PROGRESS" as TicketStatus,
    source: "PORTAL",
    requesterId: "demo-emp-1",
    assigneeId: "demo-it-2",
    assetId: null,
    location: "Haber Merkezi",
    locationId: null,
    requestTypeId: null,
    formData: null,
    slaDueAt: new Date(Date.now() + 2 * 3600 * 1000),
    resolvedAt: null,
    closedAt: null,
    createdAt: new Date(Date.now() - 18 * 3600 * 1000),
    updatedAt: new Date(Date.now() - 2 * 3600 * 1000),
    requester: { name: "Ahmet Çelik", email: "ahmet.celik@halktv.com.tr", computerName: "HABER-PC-01" },
    assignee: { name: "Selin Aksoy" },
    survey: null,
    timeEntries: [],
    approvals: [],
    attachments: [],
    comments: [],
  },
  {
    id: "ticket-2",
    number: "HTV-2026-000002",
    title: "VPN erişimi kesildi — Uzaktan çalışma",
    description:
      "Evden çalışırken VPN bağlantısı kuramıyorum. Cisco AnyConnect hata kodu: 0x0000002. Dün akşamdan beri sorun var.",
    category: "NETWORK" as TicketCategory,
    priority: "URGENT" as TicketPriority,
    status: "OPEN" as TicketStatus,
    source: "PORTAL",
    location: "Evden",
    requesterId: "demo-emp-2",
    assigneeId: null,
    assetId: null,
    locationId: null,
    requestTypeId: null,
    formData: null,
    slaDueAt: new Date(Date.now() + 1 * 3600 * 1000),
    resolvedAt: null,
    closedAt: null,
    createdAt: new Date(Date.now() - 4 * 3600 * 1000),
    updatedAt: new Date(Date.now() - 4 * 3600 * 1000),
    requester: { name: "Fatma Demir", email: "fatma.demir@halktv.com.tr", computerName: "REJI-EDITOR" },
    assignee: null,
    survey: null,
    timeEntries: [],
    approvals: [],
    attachments: [],
    comments: [],
  },
  {
    id: "ticket-3",
    number: "HTV-2026-000003",
    title: "Outlook şifre sıfırlama talebi",
    description:
      "Outlook şifremi hatırlamıyorum. Kurumsal hesabıma erişemiyorum. Lütfen sıfırlama işlemi yapılsın.",
    category: "ACCOUNT_ACCESS" as TicketCategory,
    priority: "MEDIUM" as TicketPriority,
    status: "WAITING_REQUESTER" as TicketStatus,
    source: "PORTAL",
    requesterId: "demo-emp-1",
    assigneeId: "demo-it-1",
    assetId: null,
    locationId: null,
    requestTypeId: null,
    formData: null,
    slaDueAt: new Date(Date.now() + 24 * 3600 * 1000),
    resolvedAt: null,
    closedAt: null,
    createdAt: new Date(Date.now() - 3 * 24 * 3600 * 1000),
    updatedAt: new Date(Date.now() - 1 * 24 * 3600 * 1000),
    requester: { name: "Ahmet Çelik", email: "ahmet.celik@halktv.com.tr", computerName: "HABER-PC-01" },
    assignee: { name: "Berk Yılmaz" },
    survey: null,
    timeEntries: [
      {
        id: "te-1",
        minutes: 30,
        note: "Şifre sıfırlama politikası gönderildi.",
        spentAt: new Date(Date.now() - 2 * 24 * 3600 * 1000),
        createdAt: new Date(Date.now() - 2 * 24 * 3600 * 1000),
        user: { name: "Berk Yılmaz", email: "berk.yilmaz@halktv.com.tr" },
      },
    ],
    approvals: [],
    attachments: [],
    comments: [],
  },
  {
    id: "ticket-4",
    number: "HTV-2026-000004",
    title: "Yeni bilgisayar kurulum talebi",
    description:
      "Prodüksiyon departmanına yeni katılan personel için dizüstü bilgisayar kurulumu gerekiyor. Windows 11 ve Adobe Creative Suite yüklenecek.",
    category: "HARDWARE" as TicketCategory,
    priority: "MEDIUM" as TicketPriority,
    status: "RESOLVED" as TicketStatus,
    source: "PORTAL",
    requesterId: "demo-emp-2",
    assigneeId: "demo-it-2",
    assetId: null,
    locationId: null,
    requestTypeId: null,
    formData: null,
    slaDueAt: new Date(Date.now() - 2 * 24 * 3600 * 1000),
    resolvedAt: new Date(Date.now() - 1 * 24 * 3600 * 1000),
    closedAt: null,
    createdAt: new Date(Date.now() - 5 * 24 * 3600 * 1000),
    updatedAt: new Date(Date.now() - 1 * 24 * 3600 * 1000),
    requester: { name: "Fatma Demir", email: "fatma.demir@halktv.com.tr", computerName: "REJI-EDITOR" },
    assignee: { name: "Selin Aksoy" },
    survey: { rating: 5, comment: "Çok hızlı çözüldü, teşekkürler!" },
    timeEntries: [
      {
        id: "te-2",
        minutes: 120,
        note: "Kurulum ve yapılandırma tamamlandı.",
        spentAt: new Date(Date.now() - 1 * 24 * 3600 * 1000),
        createdAt: new Date(Date.now() - 1 * 24 * 3600 * 1000),
        user: { name: "Selin Aksoy", email: "selin.aksoy@halktv.com.tr" },
      },
    ],
    approvals: [],
    attachments: [],
    comments: [],
  },
  {
    id: "ticket-5",
    number: "HTV-2026-000005",
    title: "MS Teams toplantı odası ekranı çalışmıyor",
    description:
      "Toplantı Odası B'deki Teams ekranı açılmıyor. Yeniden başlatmayı denedim ama ekran siyah kalıyor.",
    category: "SOFTWARE" as TicketCategory,
    priority: "HIGH" as TicketPriority,
    status: "OPEN" as TicketStatus,
    source: "PORTAL",
    requesterId: "demo-emp-1",
    assigneeId: null,
    assetId: null,
    locationId: null,
    requestTypeId: null,
    formData: null,
    slaDueAt: new Date(Date.now() + 6 * 3600 * 1000),
    resolvedAt: null,
    closedAt: null,
    createdAt: new Date(Date.now() - 1 * 3600 * 1000),
    updatedAt: new Date(Date.now() - 1 * 3600 * 1000),
    requester: { name: "Ahmet Çelik", email: "ahmet.celik@halktv.com.tr", computerName: "HABER-PC-01" },
    assignee: null,
    survey: null,
    timeEntries: [],
    approvals: [],
    attachments: [],
    comments: [],
  },
  {
    id: "ticket-6",
    number: "HTV-2026-000006",
    title: "Canlı yayın internet bağlantısı düşüyor",
    description:
      "Studio 1'de canlı yayın sırasında internet bağlantısı düşüyor. Son 3 yayında sorun yaşandı. Acil çözüm gerekiyor.",
    category: "NETWORK" as TicketCategory,
    priority: "URGENT" as TicketPriority,
    status: "IN_PROGRESS" as TicketStatus,
    source: "PHONE",
    requesterId: "demo-emp-2",
    assigneeId: "demo-it-1",
    assetId: null,
    locationId: null,
    requestTypeId: null,
    formData: null,
    slaDueAt: new Date(Date.now() - 30 * 60 * 1000), // SLA aşıldı!
    resolvedAt: null,
    closedAt: null,
    createdAt: new Date(Date.now() - 5 * 3600 * 1000),
    updatedAt: new Date(Date.now() - 30 * 60 * 1000),
    requester: { name: "Fatma Demir", email: "fatma.demir@halktv.com.tr", computerName: "REJI-EDITOR" },
    assignee: { name: "Berk Yılmaz" },
    survey: null,
    timeEntries: [],
    approvals: [],
    attachments: [],
    comments: [],
  },
];

// ─── Yorumlar ─────────────────────────────────────────────────────────────────

export const DEMO_COMMENTS: Record<string, unknown[]> = {
  "ticket-1": [
    {
      id: "c1",
      body: "Cihaza gidip kontrol ediyorum, biraz bekleyin.",
      visibility: "PUBLIC",
      authorId: "demo-it-2",
      authorName: "Selin Aksoy",
      createdAt: new Date(Date.now() - 10 * 3600 * 1000).toISOString(),
    },
    {
      id: "c2",
      body: "Yazıcının IP adresi değişmiş. Yeniden yapılandırıyorum.",
      visibility: "INTERNAL",
      authorId: "demo-it-2",
      authorName: "Selin Aksoy",
      createdAt: new Date(Date.now() - 8 * 3600 * 1000).toISOString(),
    },
    {
      id: "c3",
      body: "Teşekkürler, ne zaman çözülecek?",
      visibility: "PUBLIC",
      authorId: "demo-emp-1",
      authorName: "Ahmet Çelik",
      createdAt: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
    },
  ],
  "ticket-3": [
    {
      id: "c4",
      body: "Şifre sıfırlama talimatları e-posta ile gönderildi. Lütfen kontrol ediniz.",
      visibility: "PUBLIC",
      authorId: "demo-it-1",
      authorName: "Berk Yılmaz",
      createdAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
    },
  ],
};

// ─── Bildirimler ──────────────────────────────────────────────────────────────

export const DEMO_NOTIFICATIONS = {
  "demo-it-1": [
    {
      id: "n1",
      type: "TICKET_CREATED",
      title: "Yeni talep: VPN erişimi kesildi",
      body: "Fatma Demir tarafından acil talep açıldı.",
      link: "/tickets/ticket-2",
      isRead: false,
      createdAt: new Date(Date.now() - 4 * 3600 * 1000),
    },
    {
      id: "n2",
      type: "SLA_WARNING",
      title: "SLA ihlali: Canlı yayın internet bağlantısı",
      body: "Talep HTV-2026-000006 SLA süresini aştı.",
      link: "/tickets/ticket-6",
      isRead: false,
      createdAt: new Date(Date.now() - 35 * 60 * 1000),
    },
  ],
  "demo-emp-1": [
    {
      id: "n3",
      type: "TICKET_COMMENT",
      title: "Selin Aksoy mesaj gönderdi",
      body: "Yazıcının IP adresi değişmiş. Yeniden yapılandırıyorum.",
      link: "/tickets/ticket-1",
      isRead: false,
      createdAt: new Date(Date.now() - 8 * 3600 * 1000),
    },
  ],
};

// ─── Demo kullanıcı listesi (IT agents) ───────────────────────────────────────

export const DEMO_IT_AGENTS = DEMO_USERS.filter((u) =>
  ["IT_AGENT", "IT_LEAD", "IT_MANAGER", "SUPER_ADMIN"].includes(u.role),
).map((u) => ({ id: u.id, name: u.name, email: u.email }));

// ─── İstatistikler (IT paneli) ────────────────────────────────────────────────

export function getDemoStats() {
  const tickets = DEMO_TICKETS;
  return {
    open: tickets.filter((t) => t.status === "OPEN").length,
    inProgress: tickets.filter((t) => t.status === "IN_PROGRESS").length,
    unassigned: tickets.filter(
      (t) =>
        t.assigneeId === null &&
        ["OPEN", "IN_PROGRESS"].includes(t.status),
    ).length,
    totalUsers: DEMO_USERS.length,
    slaBreached: tickets.filter(
      (t) =>
        t.slaDueAt &&
        t.slaDueAt < new Date() &&
        ["OPEN", "IN_PROGRESS", "WAITING_REQUESTER"].includes(t.status),
    ).length,
  };
}

export const DEMO_DEPARTMENTS = [
  { id: 'd1', name: 'Haber Merkezi' },
  { id: 'd2', name: 'Reji' },
  { id: 'd3', name: 'Teknik' }
];

export const DEMO_COMPUTERS = [
  { id: 'c1', name: 'REJI-EDITOR-01', userId: 'demo-emp-1' },
  { id: 'c2', name: 'HABER-PC-05', userId: null }
];
