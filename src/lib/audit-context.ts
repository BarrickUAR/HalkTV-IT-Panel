import { headers } from "next/headers";
import { isIP } from "node:net";
import { prisma } from "@/lib/prisma";

export async function auditContext(actorId?: string | null, metadata: Record<string, unknown> = {}, explicitIp?: string | null) {
  // Anonymous feedback stays anonymous.
  if (!actorId) return { metadata, ip: explicitIp || null };
  let requestIp: string | null = null;
  try {
    const h = await headers();
    const candidate = (h.get("x-forwarded-for")?.split(",")[0] || h.get("x-real-ip") || "").trim().replace(/^::ffff:/, "");
    if (isIP(candidate)) requestIp = candidate;
  } catch { /* Background jobs do not have request headers. */ }
  const actor = await prisma.user.findUnique({ where: { id: actorId }, select: {
    name: true, title: true, department: { select: { name: true, floor: true } },
  } });
  const localIp = typeof metadata.ip === "string" && isIP(metadata.ip) ? metadata.ip : null;
  return { ip: explicitIp || localIp || requestIp, metadata: {
    ...metadata, actorName: actor?.name, actorTitle: actor?.title,
    actorDepartment: actor?.department?.name, actorFloor: actor?.department?.floor,
    requestIp, ipSource: explicitIp || localIp ? "reported" : requestIp ? "request" : null,
  } };
}
