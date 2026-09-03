import { HiOutlineSpeakerWave } from "react-icons/hi2";

import { cn } from "@/lib/utils";
import { ANNOUNCEMENT_BANNER } from "@/lib/announcement-labels";

const IS_DEMO = process.env.DEMO_MODE === "true";

export async function AnnouncementBanner() {
  if (IS_DEMO) {
    // Demo modda örnek duyuru göster
    return (
      <div
        className={cn(
          "flex items-start gap-2 border-b px-4 py-2 text-sm lg:px-6",
          ANNOUNCEMENT_BANNER["INFO"],
        )}
      >
        <HiOutlineSpeakerWave className="mt-0.5 size-4 shrink-0" />
        <p>
          <span className="font-semibold">Önizleme Modu</span>
          <span className="opacity-90"> — Bu demo ortamıdır. Veriler kaydedilmez.</span>
        </p>
      </div>
    );
  }

  try {
    const { prisma } = await import("@/lib/prisma");
    const now = new Date();
    const items = await prisma.announcement.findMany({
      where: {
        isActive: true,
        AND: [
          { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
          { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
        ],
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    });
    if (items.length === 0) return null;

      <div className="overflow-hidden bg-primary px-4 py-2 text-sm text-primary-foreground">
        <div className="flex animate-marquee whitespace-nowrap">
          {items.map((a) => (
            <span key={a.id} className="mx-8 flex items-center gap-2">
              <HiOutlineSpeakerWave className="size-4 shrink-0" />
              <span className="font-bold">{a.title}</span>
              {a.body && <span className="opacity-90"> — {a.body}</span>}
            </span>
          ))}
          {/* Duplicate for infinite effect */}
          {items.map((a) => (
            <span key={a.id + "-dup"} className="mx-8 flex items-center gap-2">
              <HiOutlineSpeakerWave className="size-4 shrink-0" />
              <span className="font-bold">{a.title}</span>
              {a.body && <span className="opacity-90"> — {a.body}</span>}
            </span>
          ))}
        </div>
      </div>
  } catch {
    return null;
  }
}
