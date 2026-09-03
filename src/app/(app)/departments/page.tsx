import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { isITStaff } from "@/lib/rbac/permissions";
import { redirect } from "next/navigation";
import { DepartmentForm } from "./department-form";
import { Button } from "@/components/ui/button";
import { deleteDepartmentAction } from "./actions";

export default async function DepartmentsPage() {
  const user = await requireUser();
  if (!isITStaff(user.role)) redirect("/dashboard");

  const departments = await prisma.department.findMany({
    include: {
      _count: {
        select: {
          users: true,
          computers: true,
          tickets: true,
        },
      },
    },
    orderBy: { name: "asc" },
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Departman Yönetimi</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Personellerin talep açarken ve profil tanımlarken seçeceği kurumsal departman listesi.
        </p>
      </div>

      <DepartmentForm />

      <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
        <table className="w-full text-sm text-left">
          <thead className="bg-muted/50 text-muted-foreground border-b text-xs uppercase font-semibold">
            <tr>
              <th className="px-4 py-3">Departman Adı</th>
              <th className="px-4 py-3 text-center">Personel</th>
              <th className="px-4 py-3 text-center">Kayıtlı Cihaz</th>
              <th className="px-4 py-3 text-right">İşlem</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {departments.length === 0 ? (
              <tr>
                <td colSpan={4} className="p-8 text-center text-muted-foreground">
                  Henüz kayıtlı departman bulunmuyor. Yukarıdaki formdan hemen bir departman ekleyebilirsiniz.
                </td>
              </tr>
            ) : (
              departments.map((d) => (
                <tr key={d.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3 font-medium text-foreground">{d.name}</td>
                  <td className="px-4 py-3 text-center text-muted-foreground">{d._count.users}</td>
                  <td className="px-4 py-3 text-center text-muted-foreground">{d._count.computers}</td>
                  <td className="px-4 py-3 text-right">
                    <form
                      action={async () => {
                        "use server";
                        await deleteDepartmentAction(d.id);
                      }}
                    >
                      <Button
                        type="submit"
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 px-2"
                      >
                        Sil
                      </Button>
                    </form>
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
