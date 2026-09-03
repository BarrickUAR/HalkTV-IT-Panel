"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  HiOutlineChartBarSquare,
  HiOutlineBookOpen,
  HiOutlineCube,
  HiOutlineCalendar,
  HiOutlineClock,
  HiOutlineKey,
  HiOutlineComputerDesktop,
  HiOutlineSquares2X2,
  HiOutlineViewColumns,
  HiOutlineMapPin,
  HiOutlineSpeakerWave,
  HiOutlineArchiveBox,
  HiOutlineCog8Tooth,
  HiOutlineTicket,
  HiOutlineUsers,
  HiOutlineWrenchScrewdriver,
} from "react-icons/hi2";
import type { IconType } from "react-icons";

import type { Role } from "@prisma/client";

import { cn, playNotificationSound } from "@/lib/utils";
import { can, isITStaff } from "@/lib/rbac/permissions";

import { useEffect, useState } from "react";
import { fetchSidebarBadgeCounts } from "./sidebar-actions";

type NavItem = {
  href: string;
  label: string;
  icon: IconType;
  show: boolean;
  badge?: number;
};

type NavGroup = { title?: string; items: NavItem[] };

export function Sidebar({ role }: { role: Role }) {
  const pathname = usePathname();
  const [counts, setCounts] = useState({ tickets: 0 });
  const it = isITStaff(role);
  const isManager = role === "TEKNIK_MUDUR" || role === "SUPER_ADMIN";

  useEffect(() => {
    let live = true;
    let prev = 0;
    const load = async () => {
      try {
        const res = await fetchSidebarBadgeCounts();
        if (live) {
          if (res.tickets > prev) playNotificationSound();
          prev = res.tickets;
          setCounts(res);
        }
      } catch {}
    };
    load();
    const t = setInterval(load, 30000);
    return () => {
      live = false;
      clearInterval(t);
    };
  }, []);

  const groups: NavGroup[] = [
    {
      items: [
        {
          href: "/dashboard",
          label: "Anasayfa",
          icon: HiOutlineSquares2X2,
          show: true,
        },
        {
          href: "/tickets",
          label: it ? "Talepler" : "Taleplerim",
          icon: HiOutlineTicket,
          show: true,
          badge: counts.tickets,
        },
        { href: "/board", label: "Pano", icon: HiOutlineViewColumns, show: it },
        { href: "/knowledge", label: "Bilgi Bankası", icon: HiOutlineBookOpen, show: true },
      ],
    },
    {
      title: "Yönetim",
      items: [
        {
          href: "/users",
          label: "Kullanıcılar",
          icon: HiOutlineUsers,
          show: can(role, "user:manage"),
        },
        {
          href: "/departments",
          label: "Departmanlar",
          icon: HiOutlineCube,
          show: can(role, "location:manage"),
        },
        {
          href: "/inventory",
          label: "Envanter (Cihazlar)",
          icon: HiOutlineComputerDesktop,
          show: can(role, "asset:manage"),
        },
        {
          href: "/audit",
          label: "İşlem Kayıtları (Loglar)",
          icon: HiOutlineClock,
          show: it,
        },
        {
          href: "/reports",
          label: "Raporlar",
          icon: HiOutlineChartBarSquare,
          show: can(role, "report:view"),
        },
        {
          href: "/announcements",
          label: "Duyurular",
          icon: HiOutlineSpeakerWave,
          show: can(role, "announcement:manage"),
        },
      ],
    },
    {
      items: [
        { href: "/profile", label: "Profilim", icon: HiOutlineCog8Tooth, show: true },
      ],
    },
  ];

  return (
    <nav className="flex flex-col gap-4 p-3">
      {groups.map((group, gi) => {
        const items = group.items.filter((i) => i.show);
        if (items.length === 0) return null;
        return (
          <div key={gi} className="flex flex-col gap-1">
            {group.title ? (
              <p className="px-3 pb-1 text-[11px] font-semibold tracking-wider text-muted-foreground/70 uppercase">
                {group.title}
              </p>
            ) : null}
            {items.map((item) => {
              const active =
                pathname === item.href ||
                pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <div className="flex items-center gap-3">
                    <item.icon className="size-5" />
                    {item.label}
                  </div>
                  {item.badge && item.badge > 0 ? (
                    <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                      {item.badge > 99 ? "99+" : item.badge}
                    </span>
                  ) : null}
                </Link>
              );
            })}
          </div>
        );
      })}
    </nav>
  );
}
