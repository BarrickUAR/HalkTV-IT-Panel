import type { Metadata } from "next";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { ProfileForm } from "./profile-form";
import { DEMO_DEPARTMENTS, DEMO_COMPUTERS } from "@/lib/demo-data";

export const metadata: Metadata = { title: "Profilim" };

export default async function ProfilePage() {
  const user = await requireUser();
  let dbUser: any = user;
  let departments: any[] = [];
  let computers: any[] = [];

  if (process.env.DEMO_MODE !== "true") {
    const fetched = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        name: true,
        email: true,
        role: true,
        image: true,
        title: true,
        departmentId: true,
        phone: true,
      }
    });
    if (fetched) dbUser = fetched;
    departments = await prisma.department.findMany({ orderBy: { name: "asc" } });
    computers = await prisma.computer.findMany({ 
      where: { OR: [{ userId: null }, { userId: user.id }] },
      orderBy: { name: "asc" } 
    });
  } else {
    // Demo
    dbUser = { ...user, phone: "0532 XXX XX XX", departmentId: "d1" };
    departments = DEMO_DEPARTMENTS;
    computers = DEMO_COMPUTERS.filter(c => c.userId === null || c.userId === user.id);
  }

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
