import { Logo } from "@/components/brand/logo";
import { AnnouncementBanner } from "@/components/app-shell/announcement-banner";
import { LiveChat } from "@/components/app-shell/live-chat";
import { Sidebar } from "@/components/app-shell/sidebar";
import { SidebarAnnouncements } from "@/components/app-shell/sidebar-announcements";
import { SidebarUserCard } from "@/components/app-shell/sidebar-user-card";
import { Topbar } from "@/components/app-shell/topbar";
import { EmployeeDock } from "@/components/app-shell/employee-dock";
import { requireUser } from "@/lib/auth-helpers";
import { isITStaff } from "@/lib/rbac/permissions";

import { redirect } from "next/navigation";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  // Profil adı eksikse Onboarding ekranına zorla
  if (!user.name) {
    redirect("/onboarding");
  }

  const isStaff = isITStaff(user.role);

  if (!isStaff) {
    return (
      <div className="flex min-h-dvh flex-col bg-zinc-50 dark:bg-zinc-950">
        <Topbar name={user.name} email={user.email} role={user.role} image={user.image} />

        {/* Horizontal/Curved Premium Dock for Employees */}
        <EmployeeDock role={user.role} />
        <AnnouncementBanner />

        {/* Main Content */}
        <main className="flex-1 p-4 lg:p-6 lg:pl-[120px]">
          {children}
        </main>

        <LiveChat />
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh bg-zinc-50 dark:bg-zinc-950">
      {/* Sticky sidebar — width is self-managed by the Sidebar client component */}
      <aside className="hidden lg:flex w-60 shrink-0 flex-col border-r bg-sidebar sticky top-0 h-dvh overflow-hidden">
        {/* Logo — fixed at top */}
        <div className="flex h-14 items-center border-b px-5 shrink-0 overflow-hidden">
          <Logo imageClassName="h-7 w-auto" />
        </div>

        {/* Nav + announcements — scrollable middle */}
        <div className="flex-1 overflow-y-auto min-h-0 flex flex-col">
          <Sidebar role={user.role} />
          <SidebarAnnouncements />
        </div>

        {/* Alt Kullanıcı Kartı (Gmail Profil Fotoğrafı / Halk TV Logosu ile) */}
        <SidebarUserCard name={user.name} email={user.email} role={user.role} image={user.image} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar name={user.name} email={user.email} role={user.role} image={user.image} />
        <AnnouncementBanner />
        <main className="flex-1 p-4 lg:p-6">
          {children}
        </main>
      </div>

      <LiveChat />
    </div>
  );
}
