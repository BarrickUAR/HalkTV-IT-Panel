import type { Role } from "@prisma/client";
import { GlobalSearch } from "@/components/app-shell/global-search";
import { NotificationBell } from "@/components/app-shell/notification-bell";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/app-shell/user-menu";

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
    <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center justify-between gap-2 border-b bg-background/95 backdrop-blur-md px-4 lg:px-6">
      <GlobalSearch />
      <div className="flex items-center gap-3">
        <NotificationBell />
        <ThemeToggle />
        <div className="h-4 w-px bg-border hidden sm:block" />
        <UserMenu name={name} email={email} role={role} />
      </div>
    </header>
  );
}
