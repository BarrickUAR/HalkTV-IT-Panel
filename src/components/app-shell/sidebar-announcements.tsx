import { HiOutlineSpeakerWave } from "react-icons/hi2";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

import { cn } from "@/lib/utils";
import { prisma } from "@/lib/prisma";

export async function SidebarAnnouncements() {
  let items: any[] = [];

  try {
    const now = new Date();
    items = await prisma.announcement.findMany({
      where: {
        isActive: true,
        AND: [
          { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
          { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 3,
    });
  } catch {
    // sessiz
  }

  if (items.length === 0) return null;

  return (
    <div className="mt-auto p-4 space-y-3">
      <p className="px-1 text-[11px] font-semibold tracking-wider text-muted-foreground/70 uppercase flex items-center gap-1.5">
        <HiOutlineSpeakerWave className="size-3.5" /> Gündem
      </p>
      <div className="space-y-3">
        {items.map((a) => (
          <div
            key={a.id}
            className={cn(
              "rounded-2xl p-4 text-sm shadow-xs border",
              a.level === "INFO"
                ? "bg-blue-50/50 border-blue-100/50 dark:bg-blue-950/20 dark:border-blue-900/30"
                : a.level === "WARNING"
                ? "bg-amber-50/50 border-amber-100/50 dark:bg-amber-950/20 dark:border-amber-900/30"
                : "bg-red-50/50 border-red-100/50 dark:bg-red-950/20 dark:border-red-900/30"
            )}
          >
            <p className={cn("font-semibold leading-tight", 
              a.level === "INFO" ? "text-blue-900 dark:text-blue-300" :
              a.level === "WARNING" ? "text-amber-900 dark:text-amber-300" :
              "text-red-900 dark:text-red-300"
            )}>
              {a.title}
            </p>
            {a.body && (
              <p className={cn("mt-1 text-xs line-clamp-3 leading-relaxed opacity-80",
                a.level === "INFO" ? "text-blue-800 dark:text-blue-200" :
                a.level === "WARNING" ? "text-amber-800 dark:text-amber-200" :
                "text-red-800 dark:text-red-200"
              )}>
                {a.body}
              </p>
            )}
            <p className="mt-2 text-[10px] opacity-60">
              {format(a.createdAt, "d MMM yyyy", { locale: tr })}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
