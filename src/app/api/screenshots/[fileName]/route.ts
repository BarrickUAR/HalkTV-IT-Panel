import path from "path";
import { readFile } from "fs/promises";
import { NextResponse } from "next/server";
import { resolveKioskUser } from "@/lib/auth-helpers";

const IT_ROLES = new Set(["SUPER_ADMIN", "TEKNIK_MUDUR", "TEKNIK_YONETMEN", "IT_AGENT"]);

export async function GET(_request: Request, context: { params: Promise<{ fileName: string }> }) {
  const user = await resolveKioskUser();
  if (!user || !IT_ROLES.has(user.role)) return NextResponse.json({ error: "Yetkisiz erişim." }, { status: 403 });
  const { fileName } = await context.params;
  if (!/^[a-zA-Z0-9_-]+\.png$/.test(fileName)) return NextResponse.json({ error: "Geçersiz dosya adı." }, { status: 400 });
  try {
    const data = await readFile(path.join(process.cwd(), "storage", "screenshots", fileName));
    return new NextResponse(data, { headers: { "Content-Type": "image/png", "Cache-Control": "private, max-age=60", "X-Content-Type-Options": "nosniff" } });
  } catch {
    return NextResponse.json({ error: "Ekran görüntüsü bulunamadı." }, { status: 404 });
  }
}
