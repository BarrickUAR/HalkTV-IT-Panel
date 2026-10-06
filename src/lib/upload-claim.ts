import { createHmac, timingSafeEqual } from "node:crypto";

type UploadClaim = { userId: string; url: string; expiresAt: number };

function signingSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET yapılandırılmamış.");
  return secret;
}

function signature(payload: string) {
  return createHmac("sha256", signingSecret()).update(payload).digest("base64url");
}

/** Only the account that uploaded a file may attach it to a conversation or ticket. */
export function createUploadClaim(userId: string, url: string) {
  const payload = Buffer.from(JSON.stringify({ userId, url, expiresAt: Date.now() + 15 * 60_000 } satisfies UploadClaim)).toString("base64url");
  return `${payload}.${signature(payload)}`;
}

export function verifyUploadClaim(token: unknown, userId: string, url: string, folder: "tickets" | "messages") {
  if (typeof token !== "string" || token.length > 2048 || !url.startsWith(`/api/files/${folder}/`)) return false;
  const [payload, provided, extra] = token.split(".");
  if (!payload || !provided || extra) return false;
  const expected = Buffer.from(signature(payload));
  const actual = Buffer.from(provided);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return false;
  try {
    const claim = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as UploadClaim;
    return claim.userId === userId && claim.url === url && Number.isFinite(claim.expiresAt) && claim.expiresAt >= Date.now();
  } catch {
    return false;
  }
}
