import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth-helpers";
import { saveUpload } from "@/lib/upload";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    await requireUser();
  } catch {
    return NextResponse.json({ error: "Giriş yapmanız gerekiyor." }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const subfolder = (formData.get("subfolder") as string) || "tickets";

  if (!file) {
    return NextResponse.json({ error: "Dosya bulunamadı." }, { status: 400 });
  }

  const result = await saveUpload(file, subfolder as "tickets" | "messages" | "profiles");

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json(result);
}
