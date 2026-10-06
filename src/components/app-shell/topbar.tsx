import type { Role } from "@prisma/client";
import { GlobalSearch } from "@/components/app-shell/global-search";
import { NotificationBell } from "@/components/app-shell/notification-bell";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/app-shell/user-menu";
import { PushPrompt } from "@/components/app-shell/push-prompt";
import { InstallPWA } from "@/components/app-shell/install-pwa";

export function Topbar({
  name,
  email,
  role,
  image,
}: {
  name: string | null;
  email: string | null;
  role: Role;
  image?: string | null;
}) {
  return (
    <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center justify-between gap-2 border-b bg-background/95 backdrop-blur-md px-4 lg:px-6">
      <GlobalSearch />
      <div className="flex items-center gap-3">
        <InstallPWA />
        <PushPrompt />
        <NotificationBell />
        <ThemeToggle />
        <div className="h-4 w-px bg-border hidden sm:block" />
        <UserMenu name={name} email={email} role={role} image={image} />
      </div>
    </header>
  );
}
