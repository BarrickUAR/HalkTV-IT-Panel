import Link from "next/link";
import { notFound } from "next/navigation";
import { HiOutlineArrowLeft } from "react-icons/hi2";

import { requireRole } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { assignableRoles } from "@/lib/rbac/roles";

import { EditUserForm, ResetPasswordForm } from "./edit-user-form";

export default async function EditUserPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const actor = await requireRole(["TEKNIK_YONETMEN", "TEKNIK_MUDUR", "SUPER_ADMIN"]);
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      title: true,
      email: true,
      username: true,
      role: true,
      status: true,
      departmentId: true,
      phone: true,
      employeeNo: true,
      notes: true,
      directMessagesEnabled: true,
    },
  });
  if (!user) notFound();
  
  const departments = await prisma.department.findMany({
    orderBy: { name: "asc" },
  });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          href="/users"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <HiOutlineArrowLeft className="size-4" /> Kullanıcılar
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">
          {user.name ?? user.username ?? user.email}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {user.email}
          {user.username ? ` · @${user.username}` : ""}
        </p>
      </div>

      <section className="rounded-xl border bg-card p-6">
        <h2 className="mb-4 font-semibold">Bilgiler</h2>
        <EditUserForm user={user} roles={assignableRoles(actor.role)} departments={departments} />
      </section>

      <section className="rounded-xl border bg-card p-6">
        <h2 className="mb-1 font-semibold">Şifre sıfırla</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Yeni bir şifre belirle ve kullanıcıya ilet.
        </p>
        <ResetPasswordForm userId={user.id} />
      </section>
    </div>
  );
}
