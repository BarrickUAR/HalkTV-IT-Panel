import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";
import { resolveKioskUser } from "@/lib/auth-helpers";

const execAsync = promisify(exec);

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  // Sadece kimliği doğrulanmış kiosk veya web oturumu olan istekler
  const url = new URL(req.url);
  const userId = url.searchParams.get("userId");
  const hostname = url.searchParams.get("hostname");
  const username = url.searchParams.get("username");
  const user = await resolveKioskUser({ userId, hostname, username }).catch(() => null);
  if (!user) return NextResponse.json({ error: "Giriş yapmanız gerekiyor." }, { status: 401 });

  try {
    if (process.platform === "win32") {
      const { stdout } = await execAsync(
        'powershell -NoProfile -Command "Get-Printer | Select-Object Name, Type, DriverName | ConvertTo-Json -Compress"',
        { timeout: 3000 }
      );
      if (stdout.trim()) {
        const parsed = JSON.parse(stdout);
        const list = Array.isArray(parsed) ? parsed : [parsed];
        const printers = list.map((p: any) => ({
          name: p.Name,
          driver: p.DriverName,
          isPhysical: !/PDF|XPS|OneNote|Fax/i.test(p.Name),
        }));
        return NextResponse.json({ printers });
      }
    }
  } catch {}

  // Fallback defaults for HalkTV
  return NextResponse.json({
    printers: [
      { name: "REJI (HP LaserJet Pro M501dn)", driver: "HP LaserJet Pro M501", isPhysical: true },
      { name: "HP LaserJet Pro M501 PCL 6", driver: "HP LaserJet Pro M501", isPhysical: true },
    ],
  });
}
