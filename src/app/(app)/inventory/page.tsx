import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { isITStaff } from "@/lib/rbac/permissions";
import { redirect } from "next/navigation";
import { ComputerDialog } from "./computer-dialog";
import { HiOutlineComputerDesktop, HiOutlineBuildingOffice2, HiOutlineUser } from "react-icons/hi2";

export default async function InventoryPage() {
  const user = await requireUser();
  if (!isITStaff(user.role)) redirect("/dashboard");

  const [computers, departments, users] = await Promise.all([
    prisma.computer.findMany({
      include: {
        department: { select: { id: true, name: true } },
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.department.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    prisma.user.findMany({
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Cihaz Envanteri</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Kurumdaki tüm bilgisayarlar, bulundukları departmanlar ve zimmet durumları.
          </p>
        </div>
        <ComputerDialog departments={departments} users={users} />
      </div>

      <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
        <table className="w-full text-sm text-left">
          <thead className="bg-muted/50 text-muted-foreground border-b text-xs uppercase font-semibold">
            <tr>
              <th className="px-4 py-3">Bilgisayar Adı</th>
              <th className="px-4 py-3">Bulunduğu Yer / Departman</th>
              <th className="px-4 py-3">Zimmetli Personel</th>
              <th className="px-4 py-3">Notlar</th>
              <th className="px-4 py-3 text-right">İşlem</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {computers.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-muted-foreground">
                  Henüz kayıtlı cihaz bulunmuyor. "Yeni Cihaz Ekle" butonunu kullanarak ilk bilgisayarı kaydedebilirsiniz.
                </td>
              </tr>
            ) : (
              computers.map((c) => (
                <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-semibold text-foreground">
                    <div className="flex items-center gap-2">
                      <HiOutlineComputerDesktop className="size-4 text-muted-foreground" />
                      <span>{c.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {c.department ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-muted border">
                        <HiOutlineBuildingOffice2 className="size-3.5 text-muted-foreground" />
                        {c.department.name}
                      </span>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {c.user ? (
                      <div className="flex items-center gap-1.5 font-medium text-foreground">
                        <HiOutlineUser className="size-3.5 text-muted-foreground" />
                        <span>{c.user.name || c.user.email}</span>
                      </div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {c.notes || "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <ComputerDialog
                      computer={c}
                      departments={departments}
                      users={users}
                      variant="ghost"
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
