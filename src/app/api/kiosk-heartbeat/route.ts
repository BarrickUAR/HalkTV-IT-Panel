import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateDeviceRequest } from "@/lib/device-auth";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const hostname = (body.hostname ?? body.Hostname)?.trim();
    if (!hostname || hostname === "—" || hostname.length < 2) {
      return NextResponse.json({ ok: false, error: "Invalid hostname" }, { status: 400 });
    }
    if (!await authenticateDeviceRequest(req, hostname)) {
      return NextResponse.json({ ok: false, error: "Cihaz kimliği doğrulanamadı." }, { status: 401 });
    }

    const username = (body.username ?? body.Username)?.trim() || "-";
    const rawIp = (body.ip ?? body.Ip)?.trim();
    const os = (body.os ?? body.Os)?.trim() || "Windows";
    const cpu = (body.cpu ?? body.Cpu)?.trim() || "";
    const gpu = (body.gpu ?? body.Gpu)?.trim() || "";
    const networkSpeed = (body.networkSpeed ?? body.NetworkSpeed)?.trim() || "";
    const screenCount = (body.screenCount ?? body.ScreenCount)?.trim() || "";
    const diskFreeGb = Number(body.diskFreeGb ?? body.DiskFreeGb ?? 0);
    const diskTotalGb = Number(body.diskTotalGb ?? body.DiskTotalGb ?? 0);
    const ramUsedMb = Number(body.ramUsedMb ?? body.RamUsedMb ?? 0);
    const ramTotalMb = Number(body.ramTotalMb ?? body.RamTotalMb ?? 0);
    const uptime = (body.uptime ?? body.Uptime)?.trim() || "-";
    const idleSeconds = Number(body.idleSeconds ?? body.IdleSeconds ?? 0);
    const kioskVersion = (body.kioskVersion ?? body.KioskVersion)?.trim() || null;
    const anyDeskId = (body.anyDeskId ?? body.AnyDeskId)?.trim() || null;
    const tightVncAvailable = Boolean(body.tightVncAvailable ?? body.TightVncAvailable ?? false);

    // Gerçek istemci IP'sini tespit et
    let detectedIp = rawIp && rawIp !== "—" && rawIp !== "127.0.0.1" ? rawIp : null;
    if (!detectedIp) {
      const xForwardedFor = req.headers.get("x-forwarded-for");
      if (xForwardedFor) detectedIp = xForwardedFor.split(",")[0].trim();
    }
    if (!detectedIp) detectedIp = req.headers.get("x-real-ip") || null;
    if (detectedIp && detectedIp.startsWith("::ffff:")) detectedIp = detectedIp.replace("::ffff:", "");

    const ramUsedGb = (ramUsedMb / 1024).toFixed(1);
    const ramTotalGb = (ramTotalMb / 1024).toFixed(1);
    const ramStr = ramTotalMb > 0 ? `${ramUsedGb}/${ramTotalGb} GB` : "-";
    const diskStr = diskTotalGb > 0 ? `${diskFreeGb} GB boş / ${diskTotalGb} GB` : "-";
    const now = new Date();
    const nowTr = now.toLocaleString("tr-TR");

    // Mevcut bilgisayarı bul
    const existing = await prisma.computer.findUnique({
      where: { name: hostname },
      select: { id: true, notes: true, userId: true, departmentId: true },
    });

    // Varsa yöneticinin elle yazdığı özel notları koru
    let extraNotes = "";
    if (existing?.notes) {
      extraNotes = existing.notes
        .replace(/IP:[^|]+\|?/g, "")
        .replace(/Windows:[^|]+\|?/g, "")
        .replace(/OS:[^|]+\|?/g, "")
        .replace(/CPU:[^|]+\|?/g, "")
        .replace(/GPU:[^|]+\|?/g, "")
        .replace(/Ağ:[^|]+\|?/g, "")
        .replace(/Ekran:[^|]+\|?/g, "")
        .replace(/RAM:[^|]+\|?/g, "")
        .replace(/Disk:[^|]+\|?/g, "")
        .replace(/Uptime:[^|]+\|?/g, "")
        .replace(/Son Görülme:[^|]+\|?/g, "")
        .replace(/Heartbeat:[^|]+\|?/g, "")
        .replace(/Boşta:[^|]+\|?/g, "")
        .trim();
    }

    const ipPart = detectedIp ? `IP: ${detectedIp} | ` : "";
    const cpuPart = cpu && cpu !== "-" ? ` | CPU: ${cpu}` : "";
    const gpuPart = gpu && gpu !== "-" ? ` | GPU: ${gpu}` : "";
    const netPart = networkSpeed && networkSpeed !== "-" ? ` | Ağ: ${networkSpeed}` : "";
    const screenPart = screenCount && screenCount !== "-" ? ` | Ekran: ${screenCount}` : "";
    const idlePart = idleSeconds >= 60 ? ` | Boşta: ${Math.floor(idleSeconds / 60)}dk` : "";
    const noteText = `${ipPart}Windows: ${username} | OS: ${os}${cpuPart}${gpuPart}${netPart}${screenPart} | RAM: ${ramStr} | Disk: ${diskStr} | Uptime: ${uptime} | Son Görülme: ${nowTr} | Heartbeat: ${now.toISOString()}${idlePart}${extraNotes ? " | " + extraNotes : ""}`;

    await prisma.computer.upsert({
      where: { name: hostname },
      create: {
        name: hostname,
        notes: noteText,
        ipAddress: detectedIp,
        windowsUser: username,
        operatingSystem: os,
        inventorySource: "KIOSK",
        lastHeartbeatAt: now,
        kioskVersion,
        anyDeskId,
        tightVncAvailable,
        cpuModel: cpu,
        totalRam: ramStr,
        freeDiskSpace: diskStr,
        updatedAt: now,
      },
      update: {
        notes: noteText,
        ipAddress: detectedIp,
        windowsUser: username,
        operatingSystem: os,
        inventorySource: "KIOSK",
        lastHeartbeatAt: now,
        kioskVersion,
        anyDeskId,
        tightVncAvailable,
        cpuModel: cpu,
        totalRam: ramStr,
        freeDiskSpace: diskStr,
        updatedAt: now,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("kiosk-heartbeat error:", error);
    return NextResponse.json({ ok: false, error: "Internal error" }, { status: 500 });
  }
}
