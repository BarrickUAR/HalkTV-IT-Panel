import { Logo } from "@/components/brand/logo";
import { AnnouncementBanner } from "@/components/app-shell/announcement-banner";
import { LiveChat } from "@/components/app-shell/live-chat";
import { Sidebar } from "@/components/app-shell/sidebar";
import { SidebarAnnouncements } from "@/components/app-shell/sidebar-announcements";
import { Topbar } from "@/components/app-shell/topbar";
import { EmployeeDock } from "@/components/app-shell/employee-dock";
import { requireUser } from "@/lib/auth-helpers";
import { isITStaff } from "@/lib/rbac/permissions";
import { prisma } from "@/lib/prisma";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  const isStaff = isITStaff(user.role);

  if (!isStaff) {
    return (
      <div className="flex min-h-dvh flex-col bg-zinc-50 dark:bg-zinc-950">
        <Topbar name={user.name} email={user.email} role={user.role} />
        
        {/* Horizontal Premium Dock for Employees */}
        <EmployeeDock role={user.role} />
        <AnnouncementBanner />

        {/* Main Content */}
        <main className="flex-1 p-4 lg:p-6 lg:pl-[120px]">
          <div className="mx-auto max-w-5xl">
            {children}
          </div>
        </main>
        
        <LiveChat />
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh">
      <aside className="hidden w-60 shrink-0 flex-col border-r bg-sidebar lg:flex">
        <div className="flex h-14 items-center border-b px-5 shrink-0">
          <Logo imageClassName="h-7 w-auto" />
        </div>
        <div className="flex-1 overflow-y-auto flex flex-col">
          <Sidebar role={user.role} />
          <SidebarAnnouncements />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar name={user.name} email={user.email} role={user.role} />
        <AnnouncementBanner />
        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>

      <LiveChat />
      
    </div>
  );
}
