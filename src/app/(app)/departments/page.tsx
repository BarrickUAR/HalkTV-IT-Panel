import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { isITStaff } from "@/lib/rbac/permissions";
import { redirect } from "next/navigation";
import { DepartmentForm } from "./department-form";
import { DepartmentListClient } from "./department-list";

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
    orderBy: { sortOrder: "asc" },
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Departman Yönetimi</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Personellerin talep açarken ve profil tanımlarken seçeceği kurumsal departman listesi. Tablodaki okları kullanarak sıralamayı değiştirebilirsiniz.
        </p>
      </div>

      <DepartmentForm />

      <DepartmentListClient initialDepartments={departments} />
    </div>
  );
}
