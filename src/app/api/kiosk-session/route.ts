import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { authenticateDeviceRequest } from "@/lib/device-auth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const session = await auth();

    const { searchParams } = new URL(req.url);
    const hostname = searchParams.get("hostname")?.trim();
    const osUsername = searchParams.get("username")?.trim();
    const rawIp = searchParams.get("ip")?.trim();
    const authenticatedDevice = hostname ? await authenticateDeviceRequest(req, hostname) : null;

    // Gerçek istemci IP'sini tespit et (Parametre -> Header -> Fallback)
    const xForwardedFor = req.headers.get("x-forwarded-for");
    let detectedIp = rawIp && rawIp !== "—" && rawIp !== "127.0.0.1" && !rawIp.toLowerCase().endsWith(".x") ? rawIp : null;
    if (!detectedIp && xForwardedFor) {
      detectedIp = xForwardedFor.split(",")[0].trim();
    }
    if (!detectedIp) {
      detectedIp = req.headers.get("x-real-ip") || null;
    }
    if (detectedIp && detectedIp.startsWith("::ffff:")) {
      detectedIp = detectedIp.replace("::ffff:", "");
    }

    // Kullanıcı bu cihazda oturumu kapattıysa (kiosk_logged_out=1), kesinlikle misafir modunda kalır
    const cookieHeader = req.headers.get("cookie") || "";
    const isExplicitlyLoggedOut = cookieHeader.includes("kiosk_logged_out=1");

    let user = null;

    if (session?.user?.id && !isExplicitlyLoggedOut) {
      user = await prisma.user.findUnique({
        where: { id: session.user.id, status: "ACTIVE" },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          image: true,
          title: true,
          directMessagesEnabled: true,
          department: { select: { name: true, floor: true } },
        },
      });
    }

    // Bilgisayar adını ve tespit edilen IP'sini veritabanına kaydet
    if (user && authenticatedDevice?.id && hostname && hostname !== "—" && hostname !== "Bilinmiyor" && hostname.length > 1) {
      try {
        const ipPrefix = detectedIp && detectedIp !== "127.0.0.1" ? `IP: ${detectedIp} | ` : "";
        const noteText = `${ipPrefix}Windows: ${osUsername || "-"} | Son Görülme: ${new Date().toLocaleString("tr-TR")}`;

        const existingComputer = await prisma.computer.findUnique({ where: { name: hostname }, select: { id: true, userId: true } });
        if (!existingComputer) {
          await prisma.computer.create({ data: { name: hostname, userId: user.id, notes: noteText, inventorySource: "KIOSK" } });
        } else if (!existingComputer.userId) {
          await prisma.computer.update({ where: { id: existingComputer.id }, data: { userId: user.id } });
        }
      } catch (e) {
        console.error("Auto-link computer error:", e);
      }
    }

    const now = new Date();
    let announcements: Array<{ id: string; title: string; body: string; level: string; createdAt: Date }> = [];
    try {
      announcements = await prisma.announcement.findMany({
        where: {
          isActive: true,
          AND: [
            { OR: [{ startsAt: null }, { startsAt: { lte: now } }] },
            { OR: [{ endsAt: null }, { endsAt: { gte: now } }] },
          ],
        },
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          title: true,
          body: true,
          level: true,
          createdAt: true,
        },
      });
    } catch {}

    // Bu cihaza gönderilmiş okunmamış IT mesajlarını sorgula
    let deviceMessages: Array<{
      id: string;
      title: string | null;
      message: string;
      urgent: boolean;
      createdAt: Date;
      sender: { id: string; name: string | null; image: string | null; role: string; title: string | null };
    }> = [];
    if (hostname && hostname !== "—" && hostname !== "Bilinmiyor" && hostname.length > 1) {
      try {
        const allowedComputer = await prisma.computer.findFirst({ where: { name: { equals: hostname, mode: "insensitive" } }, select: { id: true, userId: true } });
        const device = authenticatedDevice;
        const isIT = Boolean(user && ["SUPER_ADMIN", "TEKNIK_MUDUR", "TEKNIK_YONETMEN", "IT_AGENT"].includes(user.role));
        if (allowedComputer && ((user && allowedComputer.userId === user.id) || isIT || device?.id === allowedComputer.id)) {
          deviceMessages = await prisma.deviceMessage.findMany({
          where: {
            computerName: { equals: hostname, mode: "insensitive" },
            isRead: false,
          },
          orderBy: [{ urgent: "desc" }, { createdAt: "asc" }],
          take: 50,
          include: {
            sender: { select: { id: true, name: true, image: true, role: true, title: true } },
          },
          });
        }
      } catch (e) {
        console.error("Device messages fetch error:", e);
      }
    }

    return NextResponse.json({
      user: user ? { ...user, image: user.image || session?.user?.image || null } : null,
      clientIp: detectedIp ?? null,
      announcements,
      deviceMessages,
    });
  } catch {
    return NextResponse.json({ error: "Sunucu veya veritabanına erişilemiyor." }, { status: 503 });
  }
}
