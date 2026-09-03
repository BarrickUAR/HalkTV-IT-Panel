import type { Metadata } from "next";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { ProfileForm } from "./profile-form";

export const metadata: Metadata = { title: "Profilim" };

export default async function ProfilePage() {
  const user = await requireUser();

  const [dbUser, departments, computers] = await Promise.all([
    prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        image: true,
        title: true,
        departmentId: true,
        phone: true,
      },
    }),
    prisma.department.findMany({ orderBy: { name: "asc" } }),
    prisma.computer.findMany({
      where: { OR: [{ userId: null }, { userId: user.id }] },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!dbUser) return null;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Profilim</h1>
        <p className="text-muted-foreground mt-1">Sistemdeki genel kişisel bilgileriniz ve kurum içi detaylarınız.</p>
      </div>

      <ProfileForm user={dbUser} departments={departments} computers={computers} />
    </div>
  );
}
