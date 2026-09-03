import type { NotificationType, WebhookType } from "@prisma/client";

import { prisma } from "@/lib/prisma";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ?? "";

type Payload = {
  type: NotificationType;
  title: string;
  body?: string | null;
  link?: string;
};

/** Tek bir webhook'a mesaj gönderir (Teams MessageCard / Slack text). */
export async function postToWebhook(
  kind: WebhookType,
  url: string,
  p: { title: string; body?: string | null; link?: string },
): Promise<boolean> {
  const link = p.link ? (APP_URL ? `${APP_URL}${p.link}` : p.link) : undefined;
  const payload =
    kind === "SLACK"
      ? {
          text: `*${p.title}*${p.body ? `\n${p.body}` : ""}${
            link ? `\n<${link}|Aç>` : ""
          }`,
        }
      : {
          "@type": "MessageCard",
          "@context": "http://schema.org/extensions",
          summary: p.title,
          themeColor: "ED1C24",
          title: p.title,
          text: `${p.body ?? ""}${link ? `\n\n[Aç](${link})` : ""}`,
        };
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Olay tipine abone tüm aktif webhook'lara paralel gönderir (sessizce başarısız olur). */
export async function dispatchWebhooks(p: Payload): Promise<void> {
  let hooks;
  try {
    hooks = await prisma.integrationWebhook.findMany({
      where: { isActive: true, events: { has: p.type } },
    });
  } catch {
    return;
  }
  if (hooks.length === 0) return;
  await Promise.allSettled(
    hooks.map((h) =>
      postToWebhook(h.type, h.url, {
        title: p.title,
        body: p.body,
        link: p.link,
      }),
    ),
  );
}
