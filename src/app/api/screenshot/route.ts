import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { authenticateDeviceRequest } from "@/lib/device-auth";

export const dynamic = "force-dynamic";

// POST /api/screenshot
// C# client uploads a screenshot via multipart/form-data
// Fields: file (image/png), hostname
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const file = formData.get("file") as File | null;
    const hostname = (formData.get("hostname") as string | null)?.trim();

    if (!file || !hostname) {
      return NextResponse.json(
        { ok: false, error: "file and hostname are required" },
        { status: 400 }
      );
    }
    if (!await authenticateDeviceRequest(req, hostname)) {
      return NextResponse.json({ ok: false, error: "Cihaz kimliği doğrulanamadı." }, { status: 401 });
    }
    if (file.type !== "image/png" || file.size > 15 * 1024 * 1024) {
      return NextResponse.json({ ok: false, error: "Yalnızca en fazla 15 MB PNG ekran görüntüsü kabul edilir." }, { status: 400 });
    }

    const timestamp = Date.now();
    // Sanitise hostname to prevent path traversal
    const safeHostname = hostname.replace(/[^a-zA-Z0-9_\-]/g, "_");
    const fileName = `${safeHostname}-${timestamp}.png`;

    const uploadDir = path.join(process.cwd(), "storage", "screenshots");
    await mkdir(uploadDir, { recursive: true });

    const buffer = Buffer.from(await file.arrayBuffer());
    const filePath = path.join(uploadDir, fileName);
    await writeFile(filePath, buffer);

    const url = `/api/screenshots/${fileName}`;
    return NextResponse.json({ ok: true, url });
  } catch (error) {
    console.error("screenshot POST error:", error);
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
  }
}
