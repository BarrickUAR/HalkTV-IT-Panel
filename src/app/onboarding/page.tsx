import Image from "next/image";
import { redirect } from "next/navigation";

import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { completeOnboarding } from "./actions";
import { OnboardingForm } from "./onboarding-form";

export const metadata = { title: "Profil Tamamla — HalkTV IT Panel" };

export default async function OnboardingPage() {
  const user = await requireUser();

  // Ad zaten varsa dashboard'a yönlendir
  if (user.name) redirect("/dashboard");

  const departments = await prisma.department.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-primary/10 via-background to-background p-4">
      {/* Kart */}
      <div className="w-full max-w-md rounded-2xl border border-border/60 bg-card shadow-2xl">
        {/* Başlık */}
        <div className="flex flex-col items-center gap-4 rounded-t-2xl bg-gradient-to-r from-primary/90 to-primary/70 px-8 py-8 text-white">
          <div className="relative h-12 w-40">
            <Image
              src="/halktv-logo.png"
              alt="HalkTV Logo"
              fill
              className="object-contain brightness-0 invert"
              priority
            />
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight">Hoş geldiniz!</h1>
            <p className="mt-1 text-sm text-white/80">
              Devam etmek için profilinizi tamamlayın.
            </p>
          </div>
        </div>

        {/* Form */}
        <OnboardingForm departments={departments} />
      </div>
    </div>
  );
}
