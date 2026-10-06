import { NextResponse } from "next/server";
import os from "os";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const xForwardedFor = req.headers.get("x-forwarded-for");
    const clientIp = xForwardedFor?.split(",")[0].trim() || req.headers.get("x-real-ip");
    const isLocal = !clientIp || clientIp === "127.0.0.1" || clientIp === "::1" || clientIp.includes("127.0.0.1");

    // Uzak bir bilgisayardan tarayıcıyla bağlanılıyorsa asla sunucunun adını verme
    if (!isLocal) {
      return NextResponse.json({
        hostname: "Bilinmiyor",
        username: "Bilinmiyor",
      });
    }

    const hostname = os.hostname();
    let username = "Bilinmiyor";
    try {
      username = os.userInfo().username;
    } catch {}

    return NextResponse.json({
      hostname,
      username,
    });
  } catch {
    return NextResponse.json({
      hostname: "Bilinmiyor",
      username: "Bilinmiyor",
    });
  }
}
