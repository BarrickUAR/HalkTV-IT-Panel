"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";

import { cn } from "@/lib/utils";
import { AdminLogin } from "@/components/admin-login";

const ERROR_MESSAGES: Record<string, string> = {
  not_registered:
    "Bu e-posta adresi sistemde kayıtlı değil. Giriş yapabilmeniz için önce IT yöneticinizin sizi sisteme eklemesi gerekmektedir.",
  invalid_domain:
    "Giriş reddedildi! Sisteme yalnızca kurumsal @halktv.com.tr uzantılı Google hesapları ile giriş yapılabilir. Kişisel Gmail veya harici hesaplar kullanılamaz.",
  inactive:
    "Hesabınız pasif durumda. Lütfen IT departmanına başvurun.",
  OAuthAccountNotLinked:
    "Bu e-posta adresi farklı bir giriş yöntemiyle zaten kayıtlı.",
};

/* ─── ANA LOGIN İÇERİĞİ ─── */
function LoginContent() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
  const errorParam = searchParams.get("error");

  /* Google state */
  const [googlePending, setGooglePending] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);

  const oauthError = errorParam
    ? ERROR_MESSAGES[errorParam] || `Bilinmeyen Hata Kodu: ${errorParam}`
    : null;

  /* ── Google ile giriş ── */
  const handleGoogle = async () => {
    setGooglePending(true);
    setGoogleError(null);
    try {
      const res = await fetch("/api/auth/oauth-status", { cache: "no-store" });
      const data = await res.json();
      if (!data?.google) {
        setGoogleError("Google OAuth henüz yapılandırılmamış. Lütfen IT yöneticinize başvurun.");
        setGooglePending(false);
        return;
      }
      try {
        await signIn("google", { callbackUrl });
      } catch {
        window.location.href = `/api/auth/google-start?callbackUrl=${encodeURIComponent(callbackUrl)}`;
      }
    } catch {
      setGoogleError("Google girişi şu an kullanılamıyor.");
      setGooglePending(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Hata mesajları */}
      {oauthError && (
        <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive font-medium border border-destructive/20">
          {oauthError}
        </div>
      )}
      {googleError && (
        <div className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive font-medium border border-destructive/20">
          {googleError}
        </div>
      )}

      {/* ── GOOGLE BUTON ── */}
      <button
        type="button"
        onClick={handleGoogle}
        disabled={googlePending}
        className={cn(
          "flex h-12 w-full items-center justify-center gap-3 rounded-lg border bg-background px-4 text-sm font-semibold",
          "transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring cursor-pointer",
          googlePending && "opacity-60 cursor-not-allowed",
        )}
      >
        {googlePending ? (
          <span className="flex items-center gap-2">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            Yönlendiriliyorsunuz...
          </span>
        ) : (
          <>
            <GoogleIcon />
            Halk TV Maili ile Giriş Yap
          </>
        )}
      </button>

      <p className="text-xs text-muted-foreground text-center leading-relaxed">
        Sadece <strong>@halktv.com.tr</strong> uzantılı, sisteme önceden
        kaydedilmiş hesaplar ile giriş yapılabilir.
      </p>

      <AdminLogin callbackUrl={callbackUrl} />
    </div>
  );
}

/* ─── EXPORT ─── */
export function AuthPanel() {
  return (
    <div className="w-full max-w-sm space-y-4">
      <div className="rounded-xl border border-rose-100 dark:border-zinc-800 border-t-4 border-t-[#c8102e] bg-card p-6 shadow-md space-y-5">
        <div className="space-y-1 text-center pb-1">
          <div className="flex items-center justify-center gap-2 mb-1.5">
            <span className="flex size-7 items-center justify-center rounded-md bg-rose-50 dark:bg-rose-950/40 text-[#c8102e]">
              <svg viewBox="0 0 20 20" fill="currentColor" className="size-4">
                <path fillRule="evenodd" d="M10 1a4.5 4.5 0 0 0-4.5 4.5V9H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-.5V5.5A4.5 4.5 0 0 0 10 1Zm3 8V5.5a3 3 0 1 0-6 0V9h6Z" clipRule="evenodd" />
              </svg>
            </span>
            <h1 className="text-xl font-bold tracking-tight text-foreground">HalkTV Personel Girişi</h1>
          </div>
          <p className="text-xs text-muted-foreground">
            Teknik destek ve kurumsal sistemlere erişim için giriş yapın
          </p>
        </div>

        <Suspense
          fallback={
            <div className="flex h-12 items-center justify-center">
              <span className="text-sm text-muted-foreground">Yükleniyor...</span>
            </div>
          }
        >
          <LoginContent />
        </Suspense>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Hesabınız yoksa IT Teknik Destek ekibinden hesap oluşturulmasını talep edin.
      </p>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4 shrink-0" aria-hidden="true">
      <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
      <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/>
      <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"/>
      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
    </svg>
  );
}
