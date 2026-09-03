"use client";

import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import type { Role } from "@prisma/client";
import {
  HiOutlineUser,
  HiOutlineCog6Tooth,
  HiOutlineArrowRightOnRectangle,
  HiOutlineSun,
  HiOutlineMoon,
  HiOutlineChevronDown,
} from "react-icons/hi2";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserAvatar } from "@/components/app-shell/user-avatar";
import { roleLabel } from "@/lib/rbac/roles";
import { signOutAction } from "@/app/login/actions";

export function UserMenu({
  name,
  email,
  role,
}: {
  name: string | null;
  email: string | null;
  role: Role;
}) {
  const router = useRouter();
  const { setTheme, resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2.5 rounded-full p-1 transition-colors hover:bg-muted/70 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring cursor-pointer">
        <UserAvatar role={role} className="size-8" />
        <div className="hidden text-left sm:block">
          <p className="text-xs font-semibold leading-tight text-foreground">{name ?? email}</p>
          <p className="text-[11px] leading-tight text-muted-foreground">{roleLabel(role)}</p>
        </div>
        <HiOutlineChevronDown className="hidden size-3.5 text-muted-foreground sm:block" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56 p-1.5 shadow-xl border bg-popover text-popover-foreground">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="p-2 font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-semibold leading-none">{name ?? "Kullanıcı"}</p>
              <p className="text-xs leading-none text-muted-foreground truncate">{email}</p>
              <div className="pt-1">
                <span className="inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-medium bg-primary/10 text-primary border border-primary/20">
                  {roleLabel(role)}
                </span>
              </div>
            </div>
          </DropdownMenuLabel>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuItem
            onClick={() => router.push("/profile")}
            className="flex items-center gap-2 w-full cursor-pointer py-2"
          >
            <HiOutlineUser className="size-4 text-muted-foreground" />
            <span>Profilim</span>
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() => router.push("/profile")}
            className="flex items-center gap-2 w-full cursor-pointer py-2"
          >
            <HiOutlineCog6Tooth className="size-4 text-muted-foreground" />
            <span>Hesap Ayarları</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={() => setTheme(isDark ? "light" : "dark")}
          className="flex items-center gap-2 cursor-pointer py-2"
        >
          {isDark ? (
            <>
              <HiOutlineSun className="size-4 text-amber-400" />
              <span>Açık Temaya Geç</span>
            </>
          ) : (
            <>
              <HiOutlineMoon className="size-4 text-slate-700 dark:text-slate-300" />
              <span>Koyu Temaya Geç</span>
            </>
          )}
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          variant="destructive"
          onClick={() => signOutAction()}
          className="flex items-center gap-2 w-full cursor-pointer py-2 text-destructive"
        >
          <HiOutlineArrowRightOnRectangle className="size-4" />
          <span>Güvenli Çıkış</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
