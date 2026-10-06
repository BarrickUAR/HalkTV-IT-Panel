import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveKioskUser } from "@/lib/auth-helpers";
import { Prisma } from "@prisma/client";
import net from "node:net";

export const dynamic = "force-dynamic";

type ProbeCacheEntry = { reachable: boolean; expiresAt: number };
const probeCache: Map<string, ProbeCacheEntry> = ((globalThis as any).__halktvVncProbeCache ||= new Map<string, ProbeCacheEntry>());
async function vncReachable(ip?: string | null) {
  if (!ip || !/^[a-fA-F0-9:.]{3,64}$/.test(ip)) return false;
  const cached = probeCache.get(ip);
  if (cached && cached.expiresAt > Date.now()) return cached.reachable;
  const reachable = await new Promise<boolean>(resolve => {
    const socket = net.createConnection({ host: ip, port: 5900 });
    const finish = (value: boolean) => { socket.destroy(); resolve(value); };
    socket.setTimeout(650);
    socket.once("connect", () => finish(true));
    socket.once("timeout", () => finish(false));
    socket.once("error", () => finish(false));
  });
  probeCache.set(ip, { reachable, expiresAt: Date.now() + 30_000 });
  return reachable;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    const user = await resolveKioskUser({ userId: userId || undefined });
    if (!user || !["SUPER_ADMIN", "TEKNIK_MUDUR", "TEKNIK_YONETMEN", "IT_AGENT"].includes(user.role)) {
      return NextResponse.json({ ok: false, error: "Yetkisiz erişim" }, { status: 403 });
    }

    // Masaüstündeki hazır VNC profilleri ve stüdyo/reji cihazları
    const presetComputers = [
      { id: "vnc-playout2", name: "Playout 2 (Reji)", ip: "192.168.3.123", department: "Reji / Yayın", user: { name: "Playout 2", title: "Yayın Otomasyon" } },
      { id: "vnc-yonetmen", name: "Yönetmen PC", ip: "192.168.3.57", department: "Reji", user: { name: "Yönetmen", title: "Reji Kontrol" } },
      { id: "vnc-wallpc", name: "Videowall PC", ip: "192.168.3.210", department: "Stüdyo", user: { name: "Wall PC", title: "Videowall Ekran" } },
      { id: "vnc-skype1", name: "Skype 1 (Bağlantı)", ip: "192.168.3.69", department: "Reji / Haber", user: { name: "Skype 1", title: "Canlı Yayın Bağlantı" } },
      { id: "vnc-skype2", name: "Skype 2 (Bağlantı)", ip: "192.168.3.223", department: "Reji / Haber", user: { name: "Skype 2", title: "Canlı Yayın Bağlantı" } },
      { id: "vnc-skype3", name: "Skype 3 (Bağlantı)", ip: "192.168.3.147", department: "Reji / Haber", user: { name: "Skype 3", title: "Canlı Yayın Bağlantı" } },
    ];

    const computers = await prisma.computer.findMany({
      orderBy: { updatedAt: "desc" },
      include: {
        department: { select: { id: true, name: true, floor: true } },
        user: { select: { id: true, name: true, email: true, title: true, role: true, image: true } },
        deviceCredential: { select: { isActive: true, lastUsedAt: true } },
      },
    });
    const unreadDeviceChats = await prisma.deviceConversationMessage.groupBy({
      by: ["computerId"], where: { direction: "DEVICE", readAt: null }, _count: { _all: true },
    });
    const deviceChatUnreadByComputer = new Map(unreadDeviceChats.map((row) => [row.computerId, row._count._all]));

    const formattedRaw = computers.map((c) => {
      const ipMatch = c.ipAddress || c.notes?.match(/IP:\s*([^\s|]+)/)?.[1] || null;
      const winUser = c.windowsUser || c.notes?.match(/Windows:\s*([^\s|]+)/)?.[1] || null;
      const lastSeen = c.notes?.match(/Son Görülme:\s*([^|]+)/)?.[1]?.trim() || null;
      const diskMatch = c.freeDiskSpace || c.notes?.match(/Disk:\s*([^|]+)/)?.[1]?.trim() || null;
      const ramMatch = c.totalRam || c.notes?.match(/RAM:\s*([^|]+)/)?.[1]?.trim() || null;
      const osMatch = c.operatingSystem || c.notes?.match(/OS:\s*([^|]+)/)?.[1]?.trim() || null;
      const cpuMatch = c.cpuModel || c.notes?.match(/CPU:\s*([^|]+)/)?.[1]?.trim() || null;
      const gpuMatch = c.notes?.match(/GPU:\s*([^|]+)/)?.[1]?.trim() || null;
      const netMatch = c.notes?.match(/Ağ:\s*([^|]+)/)?.[1]?.trim() || null;
      const screenMatch = c.notes?.match(/Ekran:\s*([^|]+)/)?.[1]?.trim() || null;
      const uptimeMatch = c.notes?.match(/Uptime:\s*([^|]+)/)?.[1]?.trim() || null;
      const heartbeatIso = c.lastHeartbeatAt?.toISOString() || c.notes?.match(/Heartbeat:\s*([^|]+)/)?.[1]?.trim() || null;

      let isOnline = false;
      if (heartbeatIso) {
        const diff = Date.now() - new Date(heartbeatIso).getTime();
        isOnline = !isNaN(diff) && diff < 180000;
      }

      return {
        id: c.id,
        name: c.name,
        ip: ipMatch,
        winUser,
        lastSeen,
        disk: diskMatch,
        ram: ramMatch,
        os: osMatch,
        cpu: cpuMatch,
        gpu: gpuMatch,
        networkSpeed: netMatch,
        screenCount: screenMatch,
        uptime: uptimeMatch,
        isOnline,
        domain: c.domain,
        organizationalUnit: c.organizationalUnit,
        inventorySource: c.inventorySource,
        kioskInstalled: Boolean(heartbeatIso),
        kioskVersion: c.kioskVersion,
        anyDeskId: c.anyDeskId,
        tightVncAvailable: c.tightVncAvailable,
        deviceIdentityActive: Boolean(c.deviceCredential?.isActive),
        deviceChatUnread: deviceChatUnreadByComputer.get(c.id) || 0,
        lastAdSyncAt: c.lastAdSyncAt?.toISOString() || null,
        lastVncConnectedAt: c.lastVncConnectedAt?.toISOString() || null,
        department: c.department?.name || null,
        floor: c.department?.floor || null,
        user: c.user ? { id: c.user.id, name: c.user.name, email: c.user.email, title: c.user.title } : null,
      };
    });

    // One bounded result set instead of one database round trip per computer.
    const commands = formattedRaw.length ? await prisma.$queryRaw<Array<{ id: string; computerName: string; type: string; status: string; result: string | null; createdAt: Date }>>(Prisma.sql`
      SELECT "id", "computerName", "type", "status", "result", "createdAt"
      FROM (
        SELECT "id", "computerName", "type", "status", "result", "createdAt",
          ROW_NUMBER() OVER (PARTITION BY "computerName" ORDER BY "createdAt" DESC, "id" DESC) AS rn
        FROM "DeviceCommand" WHERE "computerName" IN (${Prisma.join(formattedRaw.map(c => c.name))})
      ) recent WHERE rn <= 3
    `) : [];
    const formatted = formattedRaw.map(c => ({ ...c, lastCommands: commands.filter(command => command.computerName === c.name) }));

    // Preset cihazları ile DB cihazlarını birleştir (mükerrer olmasın)
    const existingIps = new Set(formatted.map(c => c.ip).filter(Boolean));
    const merged = [
      ...presetComputers.filter(p => !existingIps.has(p.ip)),
      ...formatted,
    ];

    const vncStates = await Promise.all(merged.map(c => vncReachable(c.ip)));
    const withReachability = merged.map((computer, index) => ({ ...computer, vncReachable: vncStates[index] }));

    return NextResponse.json({ ok: true, computers: withReachability });
  } catch (error) {
    console.error("kiosk-computers error:", error);
    return NextResponse.json({ ok: false, computers: [] }, { status: 500 });
  }
}
