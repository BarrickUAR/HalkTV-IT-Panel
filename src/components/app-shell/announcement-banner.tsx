import { HiOutlineSpeakerWave } from "react-icons/hi2";
import { prisma } from "@/lib/prisma";

export async function AnnouncementBanner() {
  try {
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

    return (
      <div className="overflow-hidden bg-primary px-4 py-2 text-sm text-primary-foreground shadow-xs">
        <div className="flex animate-marquee whitespace-nowrap">
          {items.map((a) => (
            <span key={a.id} className="mx-8 flex items-center gap-2">
              <HiOutlineSpeakerWave className="size-4 shrink-0" />
              <span className="font-bold">{a.title}</span>
              {a.body && <span className="opacity-90"> — {a.body}</span>}
            </span>
          ))}
          {items.map((a) => (
            <span key={a.id + "-dup"} className="mx-8 flex items-center gap-2">
              <HiOutlineSpeakerWave className="size-4 shrink-0" />
              <span className="font-bold">{a.title}</span>
              {a.body && <span className="opacity-90"> — {a.body}</span>}
            </span>
          ))}
        </div>
      </div>
    );
  } catch {
    return null;
  }
}
