import path from "path";
import fs from "fs/promises";
import { existsSync } from "fs";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");
const MAX_SIZE = 10 * 1024 * 1024; // 10 MB
const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.ms-excel": "xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "text/plain": "txt",
  "video/mp4": "mp4",
};

export type UploadResult = {
  ok: true;
  url: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  attachmentType: "image" | "file";
} | { ok: false; error: string };

export async function saveUpload(
  file: File,
  subfolder: "tickets" | "messages" | "profiles" = "tickets"
): Promise<UploadResult> {
  if (file.size > MAX_SIZE) {
    return { ok: false, error: "Dosya boyutu 10 MB'yi aşamaz." };
  }

  const ext = ALLOWED_TYPES[file.type];
  if (!ext) {
    return { ok: false, error: "Bu dosya türü desteklenmiyor." };
  }

  const dir = path.join(UPLOAD_DIR, subfolder);
  if (!existsSync(dir)) {
    await fs.mkdir(dir, { recursive: true });
  }

  const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const filePath = path.join(dir, uniqueName);

  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(filePath, buffer);

  const isImage = file.type.startsWith("image/");

  return {
    ok: true,
    url: `/uploads/${subfolder}/${uniqueName}`,
    fileName: file.name,
    mimeType: file.type,
    sizeBytes: file.size,
    attachmentType: isImage ? "image" : "file",
  };
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
