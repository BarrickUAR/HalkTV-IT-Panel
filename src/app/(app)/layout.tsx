import { Logo } from "@/components/brand/logo";
import { AnnouncementBanner } from "@/components/app-shell/announcement-banner";
import { LiveChat } from "@/components/app-shell/live-chat";
import { Sidebar } from "@/components/app-shell/sidebar";
import { SidebarAnnouncements } from "@/components/app-shell/sidebar-announcements";
import { Topbar } from "@/components/app-shell/topbar";
import { DepartmentPickerModal } from "@/components/app-shell/department-picker";
import { requireUser } from "@/lib/auth-helpers";

import { prisma } from "@/lib/prisma";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  let departments: { id: string; name: string }[] = [];
  if (!user.department && user.role === "EMPLOYEE") {
    try {
      departments = await prisma.department.findMany({
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      });
    } catch {
      departments = [];
    }
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
      
      {/* Departman seçimi (Sadece departmanı olmayan çalışanlar için onboarding modal) */}
      {!user.department && user.role === "EMPLOYEE" && (
        <DepartmentPickerModal departments={departments} />
      )}
    </div>
  );
}
