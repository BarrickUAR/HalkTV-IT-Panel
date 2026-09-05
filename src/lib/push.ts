import webpush from "web-push";
import { prisma } from "./prisma";

// Configure web-push
webpush.setVapidDetails(
  "mailto:it@halktv.com.tr", // can be any email
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "",
  process.env.VAPID_PRIVATE_KEY || ""
);

export async function sendPushNotification(userId: string, payload: { title: string; body: string; url?: string }) {
  try {
    const subs = await prisma.pushSubscription.findMany({
      where: { userId }
    });

    if (subs.length === 0) return;

    const payloadString = JSON.stringify(payload);

    await Promise.allSettled(
      subs.map(async (sub) => {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            p256dh: sub.p256dh,
            auth: sub.auth,
          }
        };
        try {
          await webpush.sendNotification(pushSubscription, payloadString);
        } catch (error: any) {
          if (error.statusCode === 410 || error.statusCode === 404) {
            // Subscription has expired or is no longer valid
            await prisma.pushSubscription.delete({ where: { id: sub.id } });
          } else {
            console.error("Error sending push notification:", error);
          }
        }
      })
    );
  } catch (err) {
    console.error("Failed to fetch subscriptions for push:", err);
  }
}
