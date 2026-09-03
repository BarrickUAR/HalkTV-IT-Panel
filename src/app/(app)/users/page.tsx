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
  searchParams: Promise<{ q?: string; role?: string; sort?: string }>;
}) {
  const actor = await requireRole(["TEKNIK_YONETMEN", "TEKNIK_MUDUR", "SUPER_ADMIN"]);
  const searchParams = await props.searchParams;
  const q = searchParams.q ?? "";
  const roleFilter = searchParams.role ?? "";

  const sortParam = searchParams.sort ?? "dateDesc"; // "dateDesc", "dateAsc", "nameAsc", "nameDesc", "role"
  
  let orderBy: any = { createdAt: "desc" };
  if (sortParam === "dateAsc") orderBy = { createdAt: "asc" };
  if (sortParam === "nameAsc") orderBy = { name: "asc" };
  if (sortParam === "nameDesc") orderBy = { name: "desc" };

  let [users, departments] = await Promise.all([
    prisma.user.findMany({
      orderBy,
      where: {
        AND: [
          q
            ? {
                OR: [
                  { name: { contains: q, mode: "insensitive" } },
                  { email: { contains: q, mode: "insensitive" } },
                ],
              }
            : {},
          roleFilter ? { role: roleFilter as any } : {},
        ],
      },
    }),
    prisma.department.findMany({ orderBy: { name: "asc" } }),
  ]);

  if (sortParam === "role") {
    const roleWeight: Record<string, number> = {
      SUPER_ADMIN: 4,
      TEKNIK_MUDUR: 3,
      TEKNIK_YONETMEN: 2,
      IT_AGENT: 1,
      EMPLOYEE: 0,
    };
    users = users.sort((a, b) => {
      const wa = roleWeight[a.role] ?? -1;
      const wb = roleWeight[b.role] ?? -1;
      if (wa !== wb) return wb - wa; // descending authority
      return (a.name || "").localeCompare(b.name || "", "tr");
    });
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
              <th className="px-4 py-3 font-medium">
                <Link href={`?sort=${sortParam === 'nameAsc' ? 'nameDesc' : 'nameAsc'}${q ? `&q=${q}` : ''}`} className="hover:text-foreground hover:underline">
                  Ad Soyad
                </Link>
              </th>
              <th className="px-4 py-3 font-medium">E-posta</th>
              <th className="px-4 py-3 font-medium">
                <Link href={`?sort=role${q ? `&q=${q}` : ''}`} className="hover:text-foreground hover:underline">
                  Rol (Yetki)
                </Link>
              </th>
              <th className="px-4 py-3 font-medium">Durum</th>
              <th className="px-4 py-3 font-medium">
                <Link href={`?sort=${sortParam === 'dateDesc' ? 'dateAsc' : 'dateDesc'}${q ? `&q=${q}` : ''}`} className="hover:text-foreground hover:underline">
                  Kayıt Tarihi
                </Link>
              </th>
              <th className="px-4 py-3 font-medium">Son Giriş</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t hover:bg-muted/30">
                <td className="px-4 py-3 font-medium">
                  {u.name ?? "—"}
                  {u.username && <span className="block text-xs font-normal text-muted-foreground">@{u.username}</span>}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                <td className="px-4 py-3">{(ROLE_LABELS as Record<string, string>)[u.role] ?? u.role}</td>
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium border",
                      u.status === "ACTIVE"
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                        : "bg-destructive/10 text-destructive border-destructive/20",
                    )}
                  >
                    {u.status === "ACTIVE" ? "Aktif" : "Pasif"}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-foreground text-xs">
                  {new Date(u.createdAt).toLocaleDateString("tr-TR")}
                </td>
                <td className="px-4 py-3 text-muted-foreground text-xs">
                  {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString("tr-TR", { dateStyle: "short", timeStyle: "short" }) : "Hiç girmedi"}
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
