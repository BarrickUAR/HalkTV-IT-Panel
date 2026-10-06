"use client";

import { useId, useState, type FormEvent } from "react";
import { signIn } from "next-auth/react";
import { HiOutlineArrowRight, HiOutlineChevronDown, HiOutlineEye, HiOutlineEyeSlash, HiOutlineLockClosed, HiOutlineUserCircle } from "react-icons/hi2";
import styles from "./admin-login.module.css";

export function AdminLogin({ callbackUrl }: { callbackUrl?: string }) {
  const id = useId();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const data = new FormData(event.currentTarget);
    setPending(true);
    setError("");
    try {
      const result = await signIn("credentials", {
        username: data.get("username"), password: data.get("password"), redirect: false,
      });
      if (!result || result.error || !result.ok) {
        setError("Giriş yapılamadı. Yönetici hesabınızı ve şifrenizi kontrol edin. Çok sayıda deneme yaptıysanız 15 dakika bekleyin.");
        return;
      }
      document.cookie = "kiosk_logged_out=; path=/; max-age=0";
      const target = callbackUrl ? new URL(callbackUrl, window.location.origin) : new URL(window.location.href);
      window.location.assign(target.origin === window.location.origin ? target.href : "/kiosk");
    } catch {
      setError("Giriş servisine ulaşılamadı. Lütfen tekrar deneyin.");
    } finally {
      setPending(false);
    }
  }

  return (
    <details className={styles.root}>
      <summary className={styles.summary}>
        <span className={styles.summaryIcon}><HiOutlineLockClosed aria-hidden="true" /></span>
        <span className={styles.summaryCopy}><strong>Yönetici girişi</strong><small>Yetkili hesapla devam et</small></span>
        <HiOutlineChevronDown className={styles.chevron} aria-hidden="true" />
      </summary>
      <form onSubmit={submit} className={styles.form}>
        <div className={styles.divider} />
        <label className={styles.label} htmlFor={`${id}-username`}>Kullanıcı adı veya e-posta</label>
        <div className={styles.inputWrap}>
          <HiOutlineUserCircle aria-hidden="true" />
          <input id={`${id}-username`} name="username" autoComplete="username" required maxLength={254} disabled={pending} placeholder="Kurumsal hesabınız" />
        </div>
        <label className={styles.label} htmlFor={`${id}-password`}>Şifre</label>
        <div className={styles.inputWrap}>
          <HiOutlineLockClosed aria-hidden="true" />
          <input id={`${id}-password`} name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" required maxLength={128} disabled={pending} placeholder="Şifrenizi girin" />
          <button className={styles.reveal} type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "Şifreyi gizle" : "Şifreyi göster"} aria-pressed={showPassword}>
            {showPassword ? <HiOutlineEyeSlash aria-hidden="true" /> : <HiOutlineEye aria-hidden="true" />}
          </button>
        </div>
        <p className={styles.hint}>Google şifreniz değil, yönetici hesabınıza tanımlanan şifre kullanılır.</p>
        {error && <p role="alert" className={styles.error}>{error}</p>}
        <button type="submit" disabled={pending} className={styles.submit}>
          {pending ? <><span className={styles.spinner} aria-hidden="true" /> Giriş yapılıyor…</> : <>Yönetici paneline gir <HiOutlineArrowRight aria-hidden="true" /></>}
        </button>
      </form>
    </details>
  );
}
