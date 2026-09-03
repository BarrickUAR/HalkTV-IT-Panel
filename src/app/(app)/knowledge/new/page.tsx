import { requireRole } from "@/lib/auth-helpers";
import { HiOutlineArrowLeft } from "react-icons/hi2";
import Link from "next/link";
import { NewArticleForm } from "./new-article-form";

export default async function NewArticlePage() {
  await requireRole(["IT_AGENT", "TEKNIK_YONETMEN", "TEKNIK_MUDUR", "SUPER_ADMIN"]);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link href="/knowledge" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
        <HiOutlineArrowLeft className="mr-2 size-4" />
        Bilgi Bankasına Dön
      </Link>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Yeni Makale Ekle</h1>
        <p className="text-sm text-muted-foreground mt-1">Sık karşılaşılan bir sorunun çözümünü personellerle paylaşın.</p>
      </div>

      <NewArticleForm />
    </div>
  );
}
