import type { AnnouncementLevel } from "@prisma/client";

export const ANNOUNCEMENT_LEVEL_LABELS: Record<AnnouncementLevel, string> = {
  INFO: "Bilgi",
  WARNING: "Uyarı",
  OUTAGE: "Kesinti",
};

export const ANNOUNCEMENT_BANNER: Record<AnnouncementLevel, string> = {
  INFO: "bg-blue-500/10 text-blue-700 dark:text-blue-300",
  WARNING: "bg-amber-500/15 text-amber-800 dark:text-amber-300",
  OUTAGE: "bg-red-500/15 text-red-800 dark:text-red-300",
};
