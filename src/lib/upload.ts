import path from "path";
import fs from "fs/promises";
import { existsSync } from "fs";

const UPLOAD_DIR = path.join(process.cwd(), "storage", "uploads");
export const MAX_UPLOAD_SIZE = 50 * 1024 * 1024; // 50 MB
const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/pjpeg": "jpg",
  "image/png": "png",
  "image/x-png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/bmp": "bmp",
  "image/x-icon": "ico",
  "application/pdf": "pdf",
  "application/msword": "doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/vnd.ms-excel": "xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "application/vnd.ms-powerpoint": "ppt",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
  "text/plain": "txt",
  "text/csv": "csv",
  "application/json": "json",
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "video/x-msvideo": "avi",
  "audio/mpeg": "mp3",
  "audio/wav": "wav",
  "application/zip": "zip",
  "application/x-zip-compressed": "zip",
  "application/x-rar-compressed": "rar",
  "application/vnd.rar": "rar",
  "application/x-7z-compressed": "7z",
};

const EXT_MAP: Record<string, string> = {
  jpg: "jpg",
  jpeg: "jpg",
  png: "png",
  gif: "gif",
  webp: "webp",
  bmp: "bmp",
  ico: "ico",
  pdf: "pdf",
  doc: "doc",
  docx: "docx",
  xls: "xls",
  xlsx: "xlsx",
  ppt: "ppt",
  pptx: "pptx",
  txt: "txt",
  csv: "csv",
  log: "txt",
  json: "json",
  zip: "zip",
  rar: "rar",
  "7z": "7z",
  mp4: "mp4",
  mov: "mov",
  avi: "avi",
  mp3: "mp3",
  wav: "wav",
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
  if (!["tickets", "messages", "profiles"].includes(subfolder)) {
    return { ok: false, error: "Geçersiz yükleme klasörü." };
  }
  if (file.size > MAX_UPLOAD_SIZE) {
    return { ok: false, error: "Dosya boyutu 50 MB'yi aşamaz." };
  }

  const nameExt = path.extname(file.name || "").replace(".", "").toLowerCase();
  if (["exe", "bat", "cmd", "com", "msi", "ps1", "scr", "vbs", "js", "jse", "wsf", "hta", "lnk"].includes(nameExt)) {
    return { ok: false, error: "Çalıştırılabilir veya komut dosyaları yüklenemez." };
  }
  const ext = ALLOWED_TYPES[file.type] || EXT_MAP[nameExt];
  if (!ext) {
    return { ok: false, error: "Bu dosya türü desteklenmiyor." };
  }

  const dir = path.join(UPLOAD_DIR, subfolder);
  const resolvedRoot = path.resolve(UPLOAD_DIR) + path.sep;
  const resolvedDir = path.resolve(dir) + path.sep;
  if (!resolvedDir.startsWith(resolvedRoot)) {
    return { ok: false, error: "Geçersiz yükleme yolu." };
  }
  if (!existsSync(dir)) {
    await fs.mkdir(dir, { recursive: true });
  }

  const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const filePath = path.join(dir, uniqueName);

  const buffer = Buffer.from(await file.arrayBuffer());
  if (!matchesFileSignature(buffer, ext)) {
    return { ok: false, error: "Dosyanın içeriği ile dosya türü eşleşmiyor." };
  }
  await fs.writeFile(filePath, buffer);

  const isImage = file.type.startsWith("image/") || ["jpg", "jpeg", "png", "gif", "webp", "bmp"].includes(ext);

  return {
    ok: true,
    url: `/api/files/${subfolder}/${uniqueName}`,
    fileName: file.name,
    mimeType: file.type,
    sizeBytes: file.size,
    attachmentType: isImage ? "image" : "file",
  };
}

function startsWith(buffer: Buffer, bytes: number[]) {
  return bytes.every((byte, index) => buffer[index] === byte);
}

function looksTextual(buffer: Buffer) {
  const sample = buffer.subarray(0, Math.min(buffer.length, 4096));
  return !sample.includes(0) && Array.from(sample).filter(byte => byte < 9 || (byte > 13 && byte < 32)).length < Math.max(2, sample.length * 0.02);
}

function matchesFileSignature(buffer: Buffer, ext: string) {
  if (!buffer.length) return false;
  if (ext === "jpg") return startsWith(buffer, [0xff, 0xd8, 0xff]);
  if (ext === "png") return startsWith(buffer, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (ext === "gif") return buffer.subarray(0, 6).toString("ascii") === "GIF87a" || buffer.subarray(0, 6).toString("ascii") === "GIF89a";
  if (ext === "webp") return buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP";
  if (ext === "bmp") return buffer.subarray(0, 2).toString("ascii") === "BM";
  if (ext === "ico") return startsWith(buffer, [0x00, 0x00, 0x01, 0x00]);
  if (ext === "pdf") return buffer.subarray(0, 5).toString("ascii") === "%PDF-";
  if (["docx", "xlsx", "pptx", "zip"].includes(ext)) return startsWith(buffer, [0x50, 0x4b]);
  if (["doc", "xls", "ppt"].includes(ext)) return startsWith(buffer, [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
  if (ext === "rar") return startsWith(buffer, [0x52, 0x61, 0x72, 0x21, 0x1a, 0x07]);
  if (ext === "7z") return startsWith(buffer, [0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c]);
  if (ext === "mp3") return buffer.subarray(0, 3).toString("ascii") === "ID3" || (buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0);
  if (ext === "wav") return buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WAVE";
  if (ext === "avi") return buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "AVI ";
  if (["mp4", "mov"].includes(ext)) return buffer.subarray(4, 8).toString("ascii") === "ftyp";
  if (["txt", "csv", "json", "log"].includes(ext)) return looksTextual(buffer);
  return false;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
