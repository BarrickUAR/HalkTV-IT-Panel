import type { Metadata } from "next";

import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { can } from "@/lib/rbac/permissions";

import { IntegrationSection } from "./integration-section";
import { PasswordForm, ProfileForm } from "./settings-forms";

export const metadata: Metadata = { title: "Ayarlar" };

export default async function SettingsPage() {
  const sessionUser = await requireUser();
  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: {
      name: true,
      title: true,
      phone: true,
      email: true,
      passwordHash: true,
    },
  });
  const hasPassword = Boolean(user?.passwordHash);
  const canIntegrate = can(sessionUser.role, "integration:manage");
  const webhooks = canIntegrate
    ? await prisma.integrationWebhook.findMany({ orderBy: { createdAt: "asc" } })
    : [];

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Ayarlar</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Profilini ve giriş bilgilerini yönet.
        </p>
      </div>

      <section className="rounded-xl border bg-card p-6">
        <h2 className="mb-4 font-semibold">Profil</h2>
        <ProfileForm
          name={user?.name ?? ""}
          title={user?.title ?? ""}
          phone={user?.phone ?? ""}
        />
      </section>

      <section className="rounded-xl border bg-card p-6">
        <h2 className="mb-1 font-semibold">Şifre</h2>
        {hasPassword ? (
          <>
            <p className="mb-4 text-sm text-muted-foreground">
              Kullanıcı adı + şifre ile giriş yapıyorsun.
            </p>
            <PasswordForm />
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            E-posta ({user?.email}) ile giriş yapıyorsun; şifre gerekmiyor.
          </p>
        )}
      </section>

      {canIntegrate ? <IntegrationSection webhooks={webhooks} /> : null}
    </div>
  );
}
