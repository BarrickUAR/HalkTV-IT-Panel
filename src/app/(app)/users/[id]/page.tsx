import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { UserAvatar } from "@/components/app-shell/user-avatar";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  HiOutlineArrowLeft,
  HiOutlineEnvelope,
  HiOutlinePhone,
  HiOutlineBuildingOffice2,
  HiOutlineChatBubbleLeftRight,
  HiOutlineTicket,
  HiOutlineComputerDesktop,
  HiOutlineKey,
  HiOutlinePencilSquare,
  HiOutlineIdentification,
  HiOutlineCheckCircle,
  HiOutlineXCircle,
  HiOutlineBell,
  HiOutlineGlobeAlt,
  HiOutlineNoSymbol,
  HiOutlineClock,
  HiOutlineCalendarDays,
} from "react-icons/hi2";
import { EditUserForm, AssignComputerSection, ResetPasswordForm } from "./edit-user-form";
import { assignableRoles } from "@/lib/rbac/roles";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function UserDetailPage({ params }: Props) {
  const { id } = await params;
  const me = await requireUser();

  const canManage = ["SUPER_ADMIN", "TEKNIK_MUDUR", "TEKNIK_YONETMEN", "IT_AGENT"].includes(me.role);

  // Sadece normal yetkisiz personeller kendi ID'lerine tıklarsa /profile sayfasına gitsin
  if (id === me.id && !canManage) {
    redirect("/profile");
  }

  const [user, departments, allComputers] = await Promise.all([
    prisma.user.findUnique({
      where: { id },
      include: {
        department: true,
        computers: {
          orderBy: { updatedAt: "desc" },
        },
        requestedTickets: {
          take: 8,
          orderBy: { createdAt: "desc" },
          select: { id: true, number: true, title: true, status: true, priority: true, category: true, createdAt: true },
        },
        assignedTickets: {
          take: 8,
          orderBy: { createdAt: "desc" },
          select: { id: true, number: true, title: true, status: true, priority: true, category: true, createdAt: true },
        },
        blocking: {
          include: {
            blocked: { select: { id: true, name: true, email: true } },
          },
        },
        pushSubs: {
          select: { id: true, createdAt: true },
        },
        authAcc: {
          select: { id: true, provider: true },
        },
      },
    }),
    prisma.department.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true, floor: true },
    }),
    prisma.computer.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        userId: true,
        notes: true,
        updatedAt: true,
        user: { select: { name: true } },
      },
    }),
  ]);

  if (!user) {
    notFound();
  }

  const roleBadgeMap: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
    SUPER_ADMIN: { label: "Süper Yönetici", variant: "destructive" },
    TEKNIK_MUDUR: { label: "Teknik Müdür", variant: "destructive" },
    TEKNIK_YONETMEN: { label: "Teknik Yönetmen", variant: "default" },
    GENEL_YAYIN_YONETMENI: { label: "Genel Yayın Yönetmeni", variant: "default" },
    MANAGER: { label: "Yönetici", variant: "default" },
    IT_AGENT: { label: "IT Uzmanı", variant: "secondary" },
    EMPLOYEE: { label: "Personel", variant: "outline" },
  };

  const roleInfo = roleBadgeMap[user.role] || { label: user.role, variant: "outline" };
  const hasGoogle = user.authAcc.some((a) => a.provider === "google");
  const isIT = ["IT_AGENT", "TEKNIK_YONETMEN", "TEKNIK_MUDUR", "SUPER_ADMIN"].includes(user.role);

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-16">
      {/* Üst Navigasyon */}
      <div className="flex items-center justify-between">
        <Link
          href="/users"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <HiOutlineArrowLeft className="size-4" /> Kullanıcılara Dön
        </Link>
        <span className="text-xs font-mono text-muted-foreground">Sistem ID: {user.id}</span>
      </div>

      {/* Profil Başlık & Özet Kartı */}
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-5">
            <UserAvatar name={user.name} image={user.image} className="size-20 text-2xl border-2 border-border shadow" />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold text-foreground">{user.name || "İsimsiz Kullanıcı"}</h1>
                <Badge variant={roleInfo.variant} className="font-semibold">{roleInfo.label}</Badge>
                {user.status === "ACTIVE" ? (
                  <Badge variant="outline" className="text-emerald-700 bg-emerald-50 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 gap-1 text-xs">
                    <HiOutlineCheckCircle className="size-3.5" /> Aktif Hesap
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-rose-700 bg-rose-50 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 gap-1 text-xs">
                    <HiOutlineXCircle className="size-3.5" /> Pasif Hesap
                  </Badge>
                )}
              </div>
              <p className="text-sm font-medium text-muted-foreground mt-1">
                {user.title || "Unvan Belirtilmedi"} {user.username ? <span className="font-mono text-xs text-primary font-normal">(@{user.username})</span> : null}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href={`/messages/${user.id}`}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              <HiOutlineChatBubbleLeftRight className="mr-1.5 size-4" /> Mesaj Gönder
            </Link>
            <Link
              href={`/tickets/new?requesterId=${user.id}`}
              className={buttonVariants({ variant: "default", size: "sm" })}
            >
              <HiOutlineTicket className="mr-1.5 size-4" /> Talep Aç
            </Link>
          </div>
        </div>

        {/* Detaylı Bilgi & Sistem Durumu Şeridi */}
        <div className="mt-6 grid grid-cols-1 gap-4 border-t pt-5 sm:grid-cols-4">
          <div className="flex items-center gap-3 text-sm">
            <HiOutlineEnvelope className="size-5 text-muted-foreground shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">E-posta</p>
              <p className="font-medium text-foreground truncate">{user.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-sm">
            <HiOutlinePhone className="size-5 text-muted-foreground shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Telefon / Dahili</p>
              <p className="font-medium text-foreground">{user.phone || "—"}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-sm">
            <HiOutlineBuildingOffice2 className="size-5 text-muted-foreground shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Departman & Kat</p>
              <p className="font-medium text-foreground truncate">
                {user.department ? `${user.department.name}${user.department.floor ? ` (${user.department.floor})` : ""}` : "—"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-sm">
            <HiOutlineIdentification className="size-5 text-muted-foreground shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Sicil No / Kod</p>
              <p className="font-medium text-foreground font-mono">{user.employeeNo || "—"}</p>
            </div>
          </div>
        </div>

        {/* Personelin Profil Durumu (Oturum, Google, Bildirimler) */}
        <div className="mt-4 pt-4 border-t grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-muted/20 p-3 rounded-lg">
          <div>
            <span className="text-muted-foreground flex items-center gap-1">
              <HiOutlineClock className="size-3.5" /> Son Giriş:
            </span>
            <span className="font-semibold text-foreground mt-0.5 block">
              {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString("tr-TR", { dateStyle: "short", timeStyle: "short" }) : "Hiç girmedi"}
            </span>
          </div>

          <div>
            <span className="text-muted-foreground flex items-center gap-1">
              <HiOutlineCalendarDays className="size-3.5" /> Kayıt Tarihi:
            </span>
            <span className="font-semibold text-foreground mt-0.5 block">
              {new Date(user.createdAt).toLocaleDateString("tr-TR")}
            </span>
          </div>

          <div>
            <span className="text-muted-foreground flex items-center gap-1">
              <HiOutlineGlobeAlt className="size-3.5" /> Google Hesabı:
            </span>
            <span className="font-semibold text-foreground mt-0.5 block">
              {hasGoogle ? "✓ Bağlı (Halk TV)" : "Eşleşmedi"}
            </span>
          </div>

          <div>
            <span className="text-muted-foreground flex items-center gap-1">
              <HiOutlineBell className="size-3.5" /> Anlık Bildirimler:
            </span>
            <span className="font-semibold text-foreground mt-0.5 block">
              {user.pushSubs.length > 0 ? "✓ Cihaz Kayıtlı" : "Kayıtlı Değil"}
            </span>
          </div>
        </div>
      </div>

      {/* Yetkili Yönetim Alanı */}
      {canManage ? (
        <>
          {/* Bölüm 1: Kullanıcı Bilgileri & Rol Düzenleme */}
          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between border-b pb-4 mb-5">
              <div className="flex items-center gap-2">
                <HiOutlinePencilSquare className="size-5 text-[#c8102e]" />
                <h2 className="text-base font-semibold text-foreground">Kullanıcı Bilgileri & Yetkilendirme</h2>
              </div>
              <span className="text-xs text-muted-foreground font-medium">Yönetici & IT Paneli</span>
            </div>
            <EditUserForm
              user={user}
              roles={assignableRoles(me.role)}
              departments={departments}
              computers={allComputers}
              currentUserId={me.id}
              currentUserRole={me.role}
            />
          </div>

          {/* Bölüm 2: Personel Profil Detayları (Profilinde Görünenler) */}
          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between border-b pb-4 mb-4">
              <div className="flex items-center gap-2">
                <HiOutlineBuildingOffice2 className="size-5 text-[#c8102e]" />
                <h2 className="text-base font-semibold text-foreground">Personel Profil & Gizlilik Durumu</h2>
              </div>
              <Badge variant="outline" className="text-xs">Profil Ayarları</Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-lg border bg-muted/20">
                <p className="text-xs font-semibold text-muted-foreground uppercase">Mesajlaşma (DM)</p>
                <p className="text-sm font-bold text-foreground mt-1">
                  {user.directMessagesEnabled ? "✓ DM İzni Açık" : "✕ DM İzni Kapalı"}
                </p>
                <p className="text-[11px] text-muted-foreground mt-1">Diğer personellerle birebir mesajlaşabilir.</p>
              </div>

              <div className="p-4 rounded-lg border bg-muted/20">
                <p className="text-xs font-semibold text-muted-foreground uppercase">Kiosk Canlı Destek</p>
                <p className="text-sm font-bold text-foreground mt-1">
                  {user.showInLiveChat ? "✓ IT Listesinde Görünüyor" : "✕ Listede Gizli"}
                </p>
                <p className="text-[11px] text-muted-foreground mt-1">Kiosklardan açılan hızlı sohbette IT personeli olarak listelenir.</p>
              </div>

              <div className="p-4 rounded-lg border bg-muted/20">
                <p className="text-xs font-semibold text-muted-foreground uppercase flex items-center gap-1">
                  <HiOutlineNoSymbol className="size-3.5 text-destructive" /> Engellenen Kullanıcılar
                </p>
                <p className="text-sm font-bold text-foreground mt-1">
                  {user.blocking.length} Kullanıcı Engelli
                </p>
                {user.blocking.length > 0 ? (
                  <ul className="text-xs text-muted-foreground mt-1 space-y-0.5">
                    {user.blocking.map((b) => (
                      <li key={b.blocked.id} className="truncate">• {b.blocked.name || b.blocked.email}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[11px] text-muted-foreground mt-1">Bu kullanıcının engellediği kimse yok.</p>
                )}
              </div>
            </div>
          </div>

          {/* Bölüm 3: Bağlı Cihazlar & Bilgisayar Yönetimi */}
          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between border-b pb-4 mb-5">
              <div className="flex items-center gap-2">
                <HiOutlineComputerDesktop className="size-5 text-[#c8102e]" />
                <h2 className="text-base font-semibold text-foreground">Bağlı Bilgisayarlar & Cihaz Yönetimi</h2>
              </div>
              <Badge variant="outline" className="text-xs">{user.computers.length} Cihaz Bağlı</Badge>
            </div>
            <AssignComputerSection
              userId={user.id}
              userComputers={user.computers}
              allComputers={allComputers}
            />
          </div>

          {/* Bölüm 4: Şifre Sıfırlama & Güvenlik */}
          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <div className="flex items-center gap-2 border-b pb-4 mb-5">
              <HiOutlineKey className="size-5 text-[#c8102e]" />
              <h2 className="text-base font-semibold text-foreground">Şifre Sıfırlama & Güvenlik</h2>
            </div>
            <p className="text-xs text-muted-foreground mb-4">
              Kullanıcının şifresini güncelleyebilir veya bu kullanıcıya özel rastgele bir parola oluşturabilirsiniz.
            </p>
            <ResetPasswordForm userId={user.id} />
          </div>
        </>
      ) : (
        /* Standart Kullanıcı Görünümü (Salt Okunur) */
        <div className="rounded-xl border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <HiOutlineComputerDesktop className="size-5 text-[#c8102e]" />
              <h2 className="text-base font-semibold">Bağlı Bilgisayarlar & Cihazlar</h2>
            </div>
            <Badge variant="outline" className="text-xs">{user.computers.length} Cihaz Kayıtlı</Badge>
          </div>

          {user.computers.length === 0 ? (
            <p className="text-sm text-muted-foreground">Bu kullanıcıya henüz atanmış cihaz bulunmuyor.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {user.computers.map((c) => {
                const ipMatch = c.notes?.match(/IP:\s*([^\s|]+)/)?.[1];
                const winUserMatch = c.notes?.match(/Windows:\s*([^\s|]+)/)?.[1];

                let cleanNotes = c.notes || "";
                if (ipMatch) cleanNotes = cleanNotes.replace(/IP:\s*([^\s|]+)/g, "").trim();
                if (winUserMatch) cleanNotes = cleanNotes.replace(/Windows:\s*([^\s|]+)/g, "").trim();
                cleanNotes = cleanNotes.replace(/\|/g, "").trim();

                return (
                  <div key={c.id} className="p-3.5 rounded-lg border bg-muted/30 flex items-start justify-between">
                    <div>
                      <p className="font-mono font-bold text-sm text-foreground flex items-center gap-1.5">
                        🖥️ {c.name}
                      </p>
                      {(ipMatch || winUserMatch) && (
                        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] bg-background p-1.5 rounded border border-border/50">
                          {ipMatch && <span className="font-mono text-muted-foreground"><strong className="text-foreground">IP:</strong> {ipMatch}</span>}
                          {winUserMatch && <span className="font-mono text-muted-foreground"><strong className="text-foreground">Kullanıcı:</strong> {winUserMatch}</span>}
                        </div>
                      )}
                      {cleanNotes && (
                        <p className="text-xs text-muted-foreground mt-1 whitespace-pre-line border-t pt-1 border-border/50">{cleanNotes}</p>
                      )}
                    </div>
                    <Badge variant="secondary" className="text-[10px]">Aktif</Badge>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Bölüm 5: Destek Talepleri Geçmişi (Açtığı ve Atanan Talepler) */}
      <div className="rounded-xl border bg-card p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4 border-b pb-3">
          <div className="flex items-center gap-2">
            <HiOutlineTicket className="size-5 text-[#c8102e]" />
            <h2 className="text-base font-semibold">Destek Talepleri Geçmişi</h2>
          </div>
          <Link href={`/tickets?requesterId=${user.id}`} className="text-xs text-primary hover:underline font-medium">
            Tüm Talepleri İncele →
          </Link>
        </div>

        {/* Açtığı Talepler */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
            Kullanıcının Açtığı Talepler ({user.requestedTickets.length})
          </h3>
          {user.requestedTickets.length === 0 ? (
            <p className="text-sm text-muted-foreground py-2">Kullanıcının henüz açılmış bir talebi bulunmuyor.</p>
          ) : (
            <div className="divide-y rounded-lg border">
              {user.requestedTickets.map((t) => (
                <div key={t.id} className="flex items-center justify-between p-3 hover:bg-muted/20 text-sm">
                  <div className="min-w-0 pr-4">
                    <Link href={`/tickets/${t.id}`} className="font-medium hover:underline text-foreground truncate block">
                      {t.title}
                    </Link>
                    <span className="text-[11px] font-mono text-muted-foreground">#{t.number}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline" className="text-xs font-semibold">{t.status}</Badge>
                    <span className="text-xs text-muted-foreground">{new Date(t.createdAt).toLocaleDateString("tr-TR")}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* IT Personeli ise Atanan Talepler */}
        {isIT && (
          <div className="mt-6 pt-4 border-t">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
              Kullanıcıya Atanmış Destek Talepleri ({user.assignedTickets.length})
            </h3>
            {user.assignedTickets.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">Bu personele atanmış aktif talep bulunmuyor.</p>
            ) : (
              <div className="divide-y rounded-lg border">
                {user.assignedTickets.map((t) => (
                  <div key={t.id} className="flex items-center justify-between p-3 hover:bg-muted/20 text-sm">
                    <div className="min-w-0 pr-4">
                      <Link href={`/tickets/${t.id}`} className="font-medium hover:underline text-foreground truncate block">
                        {t.title}
                      </Link>
                      <span className="text-[11px] font-mono text-muted-foreground">#{t.number}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="secondary" className="text-xs font-semibold">{t.status}</Badge>
                      <span className="text-xs text-muted-foreground">{new Date(t.createdAt).toLocaleDateString("tr-TR")}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
