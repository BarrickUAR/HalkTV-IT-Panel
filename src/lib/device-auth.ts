import { createHash, timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";

function hash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function safeEqual(left: string, right: string) {
  const a = Buffer.from(hash(left), "hex");
  const b = Buffer.from(hash(right), "hex");
  return timingSafeEqual(a, b);
}

export async function authenticateDeviceRequest(req: Request, expectedHostname?: string | null) {
  const deviceId = req.headers.get("x-device-id")?.trim();
  const token = req.headers.get("x-device-token")?.trim();
  if (deviceId && token) {
    const credential = await prisma.deviceCredential.findUnique({
      where: { computerId: deviceId },
      include: { computer: { select: { id: true, name: true } } },
    });
    if (credential?.isActive && safeEqual(hash(token), credential.tokenHash)) {
      if (expectedHostname && credential.computer.name.toUpperCase() !== expectedHostname.trim().toUpperCase()) return null;
      await prisma.deviceCredential.update({ where: { id: credential.id }, data: { lastUsedAt: new Date() } }).catch(() => {});
      return credential.computer;
    }
  }

  // Geçiş süresince eski istemciler çalışmaya devam eder. Dağıtım tamamlandığında false yapın.
  if (process.env.KIOSK_ALLOW_LEGACY_SECRET === "true") {
    const configured = process.env.KIOSK_API_SECRET || "";
    const provided = req.headers.get("x-kiosk-secret") || "";
    if (configured && provided && safeEqual(provided, configured)) return { id: null, name: expectedHostname || "legacy" };
  }
  return null;
}

export function tokenHash(token: string) {
  return hash(token);
}
