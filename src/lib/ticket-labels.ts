import type {
  TicketCategory,
  TicketPriority,
  TicketStatus,
} from "@prisma/client";

export const STATUS_LABELS: Record<TicketStatus, string> = {
  OPEN: "Açık",
  IN_PROGRESS: "İşlemde",
  WAITING_REQUESTER: "Yanıt bekliyor",
  RESOLVED: "Çözüldü",
  CLOSED: "Kapandı",
  CANCELLED: "İptal",
};

export const PRIORITY_LABELS: Record<TicketPriority, string> = {
  LOW: "Düşük",
  MEDIUM: "Orta",
  HIGH: "Yüksek",
  URGENT: "Acil",
};

export const CATEGORY_LABELS: Record<TicketCategory, string> = {
  HARDWARE: "Donanım",
  SOFTWARE: "Yazılım",
  ACCOUNT_ACCESS: "Hesap / Erişim",
  NETWORK: "Ağ",
  EMAIL: "E-posta",
  OTHER: "Diğer",
};

export const STATUS_BADGE: Record<TicketStatus, string> = {
  OPEN: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  IN_PROGRESS: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  WAITING_REQUESTER: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
  RESOLVED: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  CLOSED: "bg-muted text-muted-foreground",
  CANCELLED: "bg-muted text-muted-foreground line-through",
};

export const PRIORITY_BADGE: Record<TicketPriority, string> = {
  LOW: "bg-muted text-muted-foreground",
  MEDIUM: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  HIGH: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  URGENT: "bg-red-500/10 text-red-600 dark:text-red-400",
};
