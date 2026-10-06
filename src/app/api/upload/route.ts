import { NextRequest, NextResponse } from "next/server";
import { resolveKioskUser } from "@/lib/auth-helpers";
import { saveUpload } from "@/lib/upload";
import { rateLimit, requestIp } from "@/lib/rate-limit";
import { createUploadClaim } from "@/lib/upload-claim";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const limited = rateLimit(`upload:${requestIp(req)}`, 30, 60_000);
    if (!limited.allowed) return NextResponse.json({ error: "Çok fazla yükleme isteği." }, { status: 429, headers: { "Retry-After": String(limited.retryAfter) } });
    const user = await resolveKioskUser();
    if (!user) {
      return NextResponse.json({ error: "Giriş yapmanız gerekiyor." }, { status: 401 });
    }
    const declaredLength = Number(req.headers.get("content-length") || 0);
    if (Number.isFinite(declaredLength) && declaredLength > 52 * 1024 * 1024) {
      return NextResponse.json({ error: "Dosya boyutu 50 MB'yi aşamaz." }, { status: 413 });
    }
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const subfolder = (formData.get("subfolder") as string) || "tickets";
    if (!["tickets", "messages", "profiles"].includes(subfolder)) {
      return NextResponse.json({ error: "Geçersiz yükleme klasörü." }, { status: 400 });
    }

    if (!file) {
      return NextResponse.json({ error: "Dosya bulunamadı." }, { status: 400 });
    }

    const result = await saveUpload(file, subfolder as "tickets" | "messages" | "profiles");

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ ...result, claimToken: createUploadClaim(user.id, result.url) });
  } catch (error) {
    return NextResponse.json({ error: "Yükleme sırasında hata oluştu." }, { status: 500 });
  }
}
