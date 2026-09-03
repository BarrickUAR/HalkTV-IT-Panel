import Link from "next/link";
import { HiOutlineUser } from "react-icons/hi2";
import type { Role } from "@prisma/client";

import { GlobalSearch } from "@/components/app-shell/global-search";
import { NotificationBell } from "@/components/app-shell/notification-bell";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserAvatar } from "@/components/app-shell/user-avatar";
import { Button } from "@/components/ui/button";
import { roleLabel } from "@/lib/rbac/roles";
import { signOutAction } from "@/app/login/actions";

export function Topbar({
  name,
  email,
  role,
}: {
  name: string | null;
  email: string | null;
  role: Role;
}) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b px-4 lg:px-6">
      <GlobalSearch />
      <div className="flex items-center gap-2">
        <NotificationBell />
        <div className="flex items-center gap-3">
        <div className="hidden text-right sm:block">
          <p className="text-sm leading-tight font-medium">{name ?? email}</p>
          <p className="text-xs leading-tight text-muted-foreground">
            {roleLabel(role)}
          </p>
        </div>
        <Link href="/profile" className="transition-transform hover:scale-105 active:scale-95 cursor-pointer">
          <UserAvatar role={role} className="size-9" />
        </Link>
        <ThemeToggle />
        <form action={signOutAction}>
          <Button variant="outline" size="sm" type="submit">
            Çıkış
          </Button>
        </form>
        </div>
      </div>
    </header>
  );
}
