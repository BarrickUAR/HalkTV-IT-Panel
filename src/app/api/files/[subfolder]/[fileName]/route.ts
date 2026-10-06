import path from "path";
import { readFile } from "fs/promises";
import { NextResponse } from "next/server";
import { resolveKioskUser } from "@/lib/auth-helpers";
import { prisma } from "@/lib/prisma";

const FOLDERS = new Set(["tickets", "messages", "profiles"]);
const MIME: Record<string, string> = {
  jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", gif: "image/gif", webp: "image/webp", bmp: "image/bmp", ico: "image/x-icon",
  pdf: "application/pdf", doc: "application/msword", docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel", xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation", txt: "text/plain; charset=utf-8", csv: "text/csv; charset=utf-8",
  json: "application/json", zip: "application/zip", rar: "application/vnd.rar", "7z": "application/x-7z-compressed", mp3: "audio/mpeg", wav: "audio/wav",
  mp4: "video/mp4", mov: "video/quicktime", avi: "video/x-msvideo",
};

export async function GET(_req: Request, context: { params: Promise<{ subfolder: string; fileName: string }> }) {
  const user = await resolveKioskUser();
  if (!user) return NextResponse.json({ error: "Oturum açmanız gerekiyor." }, { status: 401 });
  const { subfolder, fileName } = await context.params;
  if (!FOLDERS.has(subfolder) || !/^[a-zA-Z0-9._-]+$/.test(fileName)) return NextResponse.json({ error: "Geçersiz dosya yolu." }, { status: 400 });
  const storagePath = `/api/files/${subfolder}/${fileName}`;
  const isIT = ["SUPER_ADMIN", "TEKNIK_MUDUR", "TEKNIK_YONETMEN", "IT_AGENT"].includes(user.role);
  let authorized = false;
  if (subfolder === "messages") {
    authorized = Boolean(await prisma.directMessage.findFirst({
      where: { attachmentUrl: storagePath, OR: [{ senderId: user.id }, { recipientId: user.id }] },
      select: { id: true },
    }));
  } else if (subfolder === "tickets") {
    authorized = Boolean(await prisma.attachment.findFirst({
      where: { storagePath, OR: [
        { uploaderId: user.id },
        { ticket: { requesterId: user.id } },
        ...(isIT ? [{}] : []),
      ] },
      select: { id: true },
    }));
  } else {
    authorized = isIT || Boolean(await prisma.user.findFirst({ where: { id: user.id, image: storagePath }, select: { id: true } }));
  }
  if (!authorized) return NextResponse.json({ error: "Bu dosyaya erişim yetkiniz yok." }, { status: 403 });
  const filePath = path.join(process.cwd(), "storage", "uploads", subfolder, fileName);
  try {
    const data = await readFile(filePath);
    const extension = path.extname(fileName).slice(1).toLowerCase();
    return new NextResponse(data, { headers: { "Content-Type": MIME[extension] || "application/octet-stream", "Content-Disposition": `inline; filename="${fileName}"`, "Cache-Control": "private, max-age=300", "X-Content-Type-Options": "nosniff" } });
  } catch {
    return NextResponse.json({ error: "Dosya bulunamadı." }, { status: 404 });
  }
}
