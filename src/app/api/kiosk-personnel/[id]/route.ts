import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { resolveKioskUser } from "@/lib/auth-helpers";

export const dynamic = "force-dynamic";
const IT_ROLES = ["SUPER_ADMIN", "TEKNIK_MUDUR", "TEKNIK_YONETMEN", "IT_AGENT"];

function noteValue(notes: string | null, key: string) {
  return notes?.match(new RegExp(`${key}:\\s*([^|]+)`, "i"))?.[1]?.trim() || null;
}

export async function GET(_req: Request, context: { params: Promise<{ id: string }> }) {
  const viewer = await resolveKioskUser();
  if (!viewer || !IT_ROLES.includes(viewer.role)) {
    return NextResponse.json({ ok: false, error: "Bu bilgi yalnızca teknik yönetime açıktır." }, { status: 403 });
  }
  const { id } = await context.params;
  const person = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true, name: true, email: true, image: true, title: true, phone: true,
      employeeNo: true, role: true, status: true, lastLoginAt: true, lastActiveAt: true,
      department: { select: { name: true, floor: true } },
      computers: { orderBy: { updatedAt: "desc" }, select: { id: true, name: true, notes: true, ipAddress: true, windowsUser: true, operatingSystem: true, lastHeartbeatAt: true, kioskVersion: true, cpuModel: true, totalRam: true, freeDiskSpace: true, updatedAt: true, department: { select: { name: true, floor: true } } } },
      assetAssignments: { orderBy: { assignedAt: "desc" }, select: { id: true, assignedAt: true, returnedAt: true, note: true, asset: { select: { id: true, assetTag: true, type: true, brand: true, model: true, serialNumber: true, status: true, location: true, warrantyEndsAt: true } } } },
    },
  });
  if (!person) return NextResponse.json({ ok: false, error: "Personel bulunamadı." }, { status: 404 });
  const computers = person.computers.map(c => {
    const heartbeat = c.lastHeartbeatAt?.toISOString() || noteValue(c.notes, "Heartbeat");
    const isOnline = heartbeat ? Date.now() - new Date(heartbeat).getTime() < 180000 : false;
    return {
      id: c.id, name: c.name, ip: c.ipAddress || noteValue(c.notes, "IP"), windowsUser: c.windowsUser || noteValue(c.notes, "Windows"),
      os: c.operatingSystem || noteValue(c.notes, "OS"), kioskVersion: c.kioskVersion, cpu: c.cpuModel || noteValue(c.notes, "CPU"), gpu: noteValue(c.notes, "GPU"),
      ram: c.totalRam || noteValue(c.notes, "RAM"), disk: c.freeDiskSpace || noteValue(c.notes, "Disk"),
      network: noteValue(c.notes, "Ağ"), screenCount: noteValue(c.notes, "Ekran"), uptime: noteValue(c.notes, "Uptime"),
      lastSeen: noteValue(c.notes, "Son Görülme"), isOnline, department: c.department?.name, floor: c.department?.floor,
    };
  });
  const isOnline = Boolean(person.lastActiveAt && Date.now() - person.lastActiveAt.getTime() < 180000);
  return NextResponse.json({ ok: true, person: { ...person, isOnline, computers } });
}
