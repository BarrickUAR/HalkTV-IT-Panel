import { createHash, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit, requestIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

function secureEqual(left: string, right: string) {
  const a = createHash("sha256").update(left).digest();
  const b = createHash("sha256").update(right).digest();
  return timingSafeEqual(a, b);
}

function clean(value: unknown, max = 500) {
  return typeof value === "string" ? value.trim().slice(0, max) || null : null;
}

export async function POST(req: NextRequest) {
  const configuredSecret = process.env.AD_SYNC_SECRET;
  const providedSecret = req.headers.get("x-ad-sync-secret") || "";
  if (!configuredSecret || !providedSecret || !secureEqual(providedSecret, configuredSecret)) {
    return NextResponse.json({ ok: false, error: "AD senkronizasyon anahtarı geçersiz." }, { status: 401 });
  }
  const limited = rateLimit(`ad-sync:${requestIp(req)}`, 4, 60_000);
  if (!limited.allowed) return NextResponse.json({ ok: false, error: "Çok sık senkronizasyon isteği." }, { status: 429 });

  const payload = await req.json().catch(() => null) as { computers?: unknown[] } | null;
  if (!payload || !Array.isArray(payload.computers) || payload.computers.length > 1000) {
    return NextResponse.json({ ok: false, error: "1–1000 bilgisayar içeren geçerli bir liste gönderin." }, { status: 400 });
  }

  const now = new Date();
  let imported = 0;
  let skipped = 0;
  for (const raw of payload.computers) {
    const item = raw as Record<string, unknown>;
    const name = clean(item.name, 120)?.toUpperCase();
    if (!name || !/^[A-Z0-9._-]{2,120}$/.test(name)) { skipped++; continue; }
    const data = {
      domain: clean(item.domain, 200),
      organizationalUnit: clean(item.organizationalUnit, 500),
      ipAddress: clean(item.ipAddress, 64),
      operatingSystem: clean(item.operatingSystem, 250),
      inventorySource: "ACTIVE_DIRECTORY",
      lastAdSyncAt: now,
    };
    await prisma.computer.upsert({
      where: { name },
      create: { name, ...data },
      update: data,
    });
    imported++;
  }

  await prisma.auditLog.create({
    data: { action: "AD_COMPUTERS_SYNCED", entityType: "Computer", entityId: "ACTIVE_DIRECTORY", metadata: { imported, skipped, sourceIp: requestIp(req) } },
  }).catch(() => {});
  return NextResponse.json({ ok: true, imported, skipped, syncedAt: now.toISOString() });
}
