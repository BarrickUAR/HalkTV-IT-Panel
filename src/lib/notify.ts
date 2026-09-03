import type { NotificationType } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { dispatchWebhooks } from "@/lib/integrations";

type NotifyInput = {
  type: NotificationType;
  title: string;
  body?: string | null;
  link?: string;
  entityType?: string;
  entityId?: string;
};

/** Tek kullanıcıya bildirim oluştur. */
export async function notify(userId: string, input: NotifyInput) {
  await prisma.notification.create({
    data: {
      userId,
      type: input.type,
      title: input.title,
      body: input.body ?? undefined,
      link: input.link,
      entityType: input.entityType,
      entityId: input.entityId,
    },
  });
  await dispatchWebhooks(input);
}

/** Birden çok kullanıcıya aynı bildirimi oluştur (tekilleştirir). */
export async function notifyMany(userIds: string[], input: NotifyInput) {
  const ids = [...new Set(userIds)].filter(Boolean);
  if (ids.length === 0) return;
  await prisma.notification.createMany({
    data: ids.map((userId) => ({
      userId,
      type: input.type,
      title: input.title,
      body: input.body ?? undefined,
      link: input.link,
      entityType: input.entityType,
      entityId: input.entityId,
    })),
  });
  await dispatchWebhooks(input);
}
