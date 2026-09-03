import type { Metadata } from "next";
import Link from "next/link";

import { requireRole } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { assignableRoles, ROLE_LABELS } from "@/lib/rbac/roles";
import { cn } from "@/lib/utils";

import { CreateUserForm } from "./create-user-form";

import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = { title: "Kullanıcı Yönetimi" };

export default async function UsersPage(props: {
  searchParams: Promise<{ q?: string; role?: string }>;
}) {
  const actor = await requireRole(["IT_MANAGER", "SUPER_ADMIN"]);
  const searchParams = await props.searchParams;
  const q = searchParams.q ?? "";
  const roleFilter = searchParams.role ?? "";

  let users: any[] = [];
  let departments: any[] = [];
  if (process.env.DEMO_MODE === "true") {
    // ... demo mode details
  } else {
    // DB
    users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      where: {
        AND: [
          q ? { OR: [{ name: { contains: q, mode: "insensitive" } }, { email: { contains: q, mode: "insensitive" } }] } : {},
          roleFilter ? { role: roleFilter as any } : {},
        ],
      },
    });
    departments = await prisma.department.findMany({ orderBy: { name: "asc" } });
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Kullanıcı Yönetimi</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Sistemdeki tüm personelleri, IT destek uzmanlarını ve yöneticileri görüntüleyin.
          </p>
        </div>
      </div>

      <section className="rounded-xl border bg-card p-6">
        <h2 className="mb-4 font-semibold">Yeni kullanıcı ekle</h2>
        <CreateUserForm roles={assignableRoles(actor.role)} departments={departments} />
      </section>

      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Ad Soyad</th>
              <th className="px-4 py-3 font-medium">Kullanıcı adı</th>
              <th className="px-4 py-3 font-medium">E-posta</th>
              <th className="px-4 py-3 font-medium">Rol</th>
              <th className="px-4 py-3 font-medium">Durum</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t hover:bg-muted/30">
                <td className="px-4 py-3 font-medium">{u.name ?? "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {u.username ?? "—"}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                <td className="px-4 py-3">{(ROLE_LABELS as Record<string, string>)[u.role] ?? u.role}</td>
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium",
                      u.status === "ACTIVE"
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {u.status === "ACTIVE" ? "Aktif" : "Pasif"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/users/${u.id}`}
                    className="text-sm text-primary hover:underline"
                  >
                    Düzenle
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
