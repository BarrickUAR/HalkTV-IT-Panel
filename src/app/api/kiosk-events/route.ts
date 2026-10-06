import { resolveKioskUser } from "@/lib/auth-helpers";
import { subscribeChatEvents } from "@/lib/chat-events";
import { prisma } from "@/lib/prisma";
import { authenticateDeviceRequest } from "@/lib/device-auth";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const user = await resolveKioskUser();
  const hostname = new URL(request.url).searchParams.get("hostname")?.trim().toLowerCase();
  let deviceChannel: string | null = null;
  if (hostname && /^[a-z0-9._-]{1,100}$/i.test(hostname)) {
    const computer = await prisma.computer.findFirst({ where: { name: { equals: hostname, mode: "insensitive" } }, select: { id: true, userId: true } });
    const isIT = Boolean(user && ["SUPER_ADMIN", "TEKNIK_MUDUR", "TEKNIK_YONETMEN", "IT_AGENT"].includes(user.role));
    const device = await authenticateDeviceRequest(request, hostname);
    if (computer && ((user && computer.userId === user.id) || isIT || device?.id === computer.id)) deviceChannel = `device:${hostname}`;
  }
  if (!user && !deviceChannel) return new Response("Oturum veya cihaz kimliği gerekli", { status: 401 });
  const encoder = new TextEncoder();
  let cleanup = () => {};
  const stream = new ReadableStream({
    start(controller) {
      let closed = false;
      const send = (text: string) => { if (!closed) controller.enqueue(encoder.encode(text)); };
      const unsubscribeUser = user ? subscribeChatEvents(user.id, event => send(`data: ${JSON.stringify(event)}\n\n`)) : () => {};
      const unsubscribeDevice = deviceChannel
        ? subscribeChatEvents(deviceChannel, event => send(`data: ${JSON.stringify(event)}\n\n`))
        : () => {};
      const heartbeat = setInterval(() => send(": keepalive\n\n"), 25000);
      // Periodic reconnect revalidates the account and releases abandoned streams.
      const expiry = setTimeout(() => { cleanup(); try { controller.close(); } catch {} }, 5 * 60 * 1000);
      const abort = () => { cleanup(); try { controller.close(); } catch {} };
      cleanup = () => { if (closed) return; closed = true; unsubscribeUser(); unsubscribeDevice(); clearInterval(heartbeat); clearTimeout(expiry); request.signal.removeEventListener("abort", abort); };
      request.signal.addEventListener("abort", abort, { once: true });
      if (request.signal.aborted) abort(); else send("retry: 3000\n\nevent: ready\ndata: {}\n\n");
    },
    cancel() { cleanup(); },
  });
  return new Response(stream, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", "X-Accel-Buffering": "no" } });
}
