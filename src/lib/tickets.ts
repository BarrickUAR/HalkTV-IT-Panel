import { prisma } from "@/lib/prisma";

/**
 * Sıradaki ticket numarası: HTV-2026-000123.
 * Postgres sequence ile üretilir (eşzamanlı taleplerde çakışma olmaz).
 */
export async function nextTicketNumber(): Promise<string> {
  const rows = await prisma.$queryRaw<{ nextval: bigint }[]>`
    SELECT nextval('ticket_number_seq') AS nextval
  `;
  const seq = Number(rows[0]?.nextval ?? 1);
  return `HTV-${String(seq).padStart(4, "0")}`;
}
