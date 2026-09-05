import type { Metadata } from "next";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/rbac/permissions";
import { ProfileForm } from "./profile-form";
import { PasswordChangeForm } from "./password-change-form";
import { IntegrationSection } from "./integration-section";
import { PushSubscriptionButton } from "./push-subscription-button";
import { MessagesSettings } from "./messages-settings";

export const metadata: Metadata = { title: "Profilim" };

export default async function ProfilePage() {
  const user = await requireUser();

  const canIntegrate = can(user.role, "integration:manage");

  const [dbUser, departments, computers, webhooks, blockedUsers] = await Promise.all([
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
        directMessagesEnabled: true,
      },
    }),
    prisma.department.findMany({ orderBy: { name: "asc" } }),
    prisma.computer.findMany({
      where: { OR: [{ userId: null }, { userId: user.id }] },
      orderBy: { name: "asc" },
    }),
    canIntegrate
      ? prisma.integrationWebhook.findMany({ orderBy: { createdAt: "asc" } })
      : Promise.resolve([]),
    prisma.userBlock.findMany({
      where: { blockerId: user.id },
      include: { blocked: { select: { id: true, name: true } } },
    }),
  ]);

  if (!dbUser) return null;

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-12">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Profilim</h1>
        <p className="text-muted-foreground mt-1">Sistemdeki genel kişisel bilgileriniz ve kurum içi detaylarınız.</p>
      </div>

      <ProfileForm user={dbUser} departments={departments} computers={computers} />
      
      <PushSubscriptionButton />

      <PasswordChangeForm />

      <MessagesSettings 
        initialEnabled={dbUser.directMessagesEnabled} 
        blockedUsers={blockedUsers.map(b => ({ id: b.blocked.id, name: b.blocked.name || "İsimsiz" }))} 
      />

      {canIntegrate ? <IntegrationSection webhooks={webhooks} /> : null}
    </div>
  );
}
