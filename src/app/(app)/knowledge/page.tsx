import type { Metadata } from "next";
import { HiOutlineMagnifyingGlass, HiOutlinePlus, HiOutlineBookOpen } from "react-icons/hi2";
import Link from "next/link";
import { format } from "date-fns";
import { tr } from "date-fns/locale";

import { requireUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";
import { isITStaff } from "@/lib/rbac/permissions";
import { buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CATEGORY_LABELS } from "@/lib/ticket-labels";

export const metadata: Metadata = { title: "Bilgi Bankası" };

export default async function KnowledgeBasePage(props: { searchParams: Promise<{ q?: string }> }) {
  const user = await requireUser();
  const it = isITStaff(user.role);
  const searchParams = await props.searchParams;
  const q = searchParams.q || "";

  let articles: any[] = [];
  
  if (process.env.DEMO_MODE === "true") {
    articles = [
      {
        id: "kb-1",
        title: "Yazıcıdan çıktı alamıyorum, ne yapmalıyım?",
        content: "Yazıcının fişini çekip takın. Eğer IP değişmişse IT ekibine talep açın.",
        category: "HARDWARE",
        viewCount: 145,
        isPublished: true,
        updatedAt: new Date(),
      },
      {
        id: "kb-2",
        title: "Ortak Klasör (NAS) Şifremi Unuttum",
        content: "Ortak klasör şifreleri Active Directory (Bilgisayar) şifrenizle aynıdır. Bilgisayar şifrenizi sıfırladığınızda klasör şifreniz de sıfırlanır.",
        category: "ACCOUNT_ACCESS",
        viewCount: 89,
        isPublished: true,
        updatedAt: new Date(),
      },
      {
        id: "kb-3",
        title: "VPN Bağlantısı Kopuyor",
        content: "Cisco AnyConnect'i kapatıp tekrar açın. Wi-Fi yerine kablolu bağlantı kullanmayı deneyin.",
        category: "NETWORK",
        viewCount: 234,
        isPublished: true,
        updatedAt: new Date(),
      }
    ];

    if (q) {
      articles = articles.filter(a => a.title.toLowerCase().includes(q.toLowerCase()));
    }
  } else {
    articles = await prisma.knowledgeArticle.findMany({
      where: {
        isPublished: true,
        ...(q ? { title: { contains: q, mode: "insensitive" } } : {}),
      },
      orderBy: { viewCount: "desc" }
    });
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Bilgi Bankası & SSS</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Sık karşılaşılan sorunların çözümlerine buradan ulaşabilirsiniz.
          </p>
        </div>
        {it && (
          <Link href="/knowledge/new" className={buttonVariants()}>
            <HiOutlinePlus className="-ml-1 mr-2 size-4" /> Yeni Makale Ekle
          </Link>
        )}
      </div>

      <div className="relative max-w-xl">
        <HiOutlineMagnifyingGlass className="absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted-foreground" />
        <form method="GET">
          <Input 
            name="q" 
            defaultValue={q} 
            placeholder="Ne aramıştınız? (Örn: Yazıcı, VPN, Şifre)" 
            className="pl-10 h-12 text-lg"
          />
        </form>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {articles.length === 0 ? (
          <div className="col-span-full rounded-lg border border-dashed py-12 text-center text-muted-foreground">
            Hiçbir sonuç bulunamadı.
          </div>
        ) : (
          articles.map((article) => (
            <Link 
              key={article.id} 
              href={`/knowledge/${article.id}`}
              className="group flex flex-col justify-between rounded-xl border bg-card p-5 transition-colors hover:border-primary/50 hover:bg-primary/5"
            >
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <span className="flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                    <HiOutlineBookOpen className="size-3.5" />
                    {CATEGORY_LABELS[article.category as keyof typeof CATEGORY_LABELS]}
                  </span>
                </div>
                <h3 className="font-semibold text-lg group-hover:text-primary transition-colors leading-tight">
                  {article.title}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground line-clamp-3 leading-relaxed">
                  {article.content}
                </p>
              </div>
              <div className="mt-5 flex items-center justify-between text-xs text-muted-foreground border-t pt-4">
                <span>{article.viewCount} Görüntülenme</span>
                <span>{format(new Date(article.updatedAt), "d MMM yyyy", { locale: tr })}</span>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
