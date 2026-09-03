import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { isITStaff } from "@/lib/rbac/permissions";
import { redirect } from "next/navigation";
import Link from "next/link";
import { HiOutlineArrowLeft, HiOutlineUser, HiOutlineComputerDesktop, HiOutlineTicket } from "react-icons/hi2";
import { roleLabel } from "@/lib/rbac/roles";
import { UserAvatar } from "@/components/app-shell/user-avatar";

export default async function DepartmentDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  if (!isITStaff(user.role)) redirect("/dashboard");

  const department = await prisma.department.findUnique({
    where: { id },
    include: {
      users: {
        orderBy: { name: "asc" },
      },
      computers: {
        orderBy: { name: "asc" },
        include: { user: true }
      },
      _count: {
        select: { tickets: true }
      }
    },
  });

  if (!department) redirect("/departments");

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/departments" className="p-2 rounded-full hover:bg-muted transition-colors">
          <HiOutlineArrowLeft className="size-5 text-muted-foreground" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{department.name}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Bu departmana ait kayıtlı personel ve cihazların detaylı listesi.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-card border rounded-xl p-6 flex flex-col items-center text-center shadow-sm">
          <div className="bg-primary/10 text-primary p-3 rounded-full mb-3">
            <HiOutlineUser className="size-6" />
          </div>
          <h3 className="text-3xl font-bold">{department.users.length}</h3>
          <p className="text-sm text-muted-foreground">Personel</p>
        </div>
        <div className="bg-card border rounded-xl p-6 flex flex-col items-center text-center shadow-sm">
          <div className="bg-blue-500/10 text-blue-500 p-3 rounded-full mb-3">
            <HiOutlineComputerDesktop className="size-6" />
          </div>
          <h3 className="text-3xl font-bold">{department.computers.length}</h3>
          <p className="text-sm text-muted-foreground">Kayıtlı Cihaz</p>
        </div>
        <div className="bg-card border rounded-xl p-6 flex flex-col items-center text-center shadow-sm">
          <div className="bg-orange-500/10 text-orange-500 p-3 rounded-full mb-3">
            <HiOutlineTicket className="size-6" />
          </div>
          <h3 className="text-3xl font-bold">{department._count.tickets}</h3>
          <p className="text-sm text-muted-foreground">Oluşturulan Talep</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
          <div className="bg-muted/50 border-b px-4 py-3 flex items-center justify-between">
            <h3 className="font-semibold flex items-center gap-2">
              <HiOutlineUser className="size-4" />
              Personeller ({department.users.length})
            </h3>
          </div>
          {department.users.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Bu departmana kayıtlı personel bulunmuyor.
            </div>
          ) : (
            <ul className="divide-y max-h-[500px] overflow-y-auto">
              {department.users.map((u) => (
                <li key={u.id} className="p-4 flex items-center gap-4 hover:bg-muted/30 transition-colors">
                  <UserAvatar role={u.role} image={u.image} className="size-10" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{u.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{roleLabel(u.role)} • {u.email}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
          <div className="bg-muted/50 border-b px-4 py-3 flex items-center justify-between">
            <h3 className="font-semibold flex items-center gap-2">
              <HiOutlineComputerDesktop className="size-4" />
              Kayıtlı Cihazlar ({department.computers.length})
            </h3>
          </div>
          {department.computers.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              Bu departmana kayıtlı cihaz bulunmuyor.
            </div>
          ) : (
            <ul className="divide-y max-h-[500px] overflow-y-auto">
              {department.computers.map((c) => (
                <li key={c.id} className="p-4 flex items-center justify-between hover:bg-muted/30 transition-colors">
                  <div>
                    <p className="text-sm font-semibold flex items-center gap-2">
                      {c.name}
                    </p>
                    {c.notes && (
                      <p className="text-xs text-muted-foreground mt-1 truncate max-w-[200px]">{c.notes}</p>
                    )}
                  </div>
                  <div className="text-right text-xs">
                    {c.user ? (
                      <span className="bg-primary/10 text-primary px-2 py-1 rounded-full font-medium">
                        Atanan: {c.user.name}
                      </span>
                    ) : (
                      <span className="bg-yellow-500/10 text-yellow-600 px-2 py-1 rounded-full font-medium">
                        Boşta
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
