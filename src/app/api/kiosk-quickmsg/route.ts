import { resolveKioskUser } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { Role } from '@prisma/client';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      message?: string;
      hostname?: string;
      userId?: string;
      username?: string;
    };

    const sender = await resolveKioskUser({
      userId: body.userId,
      hostname: body.hostname,
      username: body.username,
    });

    if (!sender) {
      return NextResponse.json({ ok: false, error: 'Oturum bulunamadı. Lütfen giriş yapın.' }, { status: 401 });
    }
    const message = body.message?.trim();
    const pcInfo = body.hostname ? ` [🖥️ ${body.hostname}]` : '';
    if (!message) {
      return NextResponse.json({ ok: false, error: 'Mesaj boş olamaz.' }, { status: 400 });
    }

    const itRoles: Role[] = ['IT_AGENT', 'TEKNIK_MUDUR', 'SUPER_ADMIN', 'TEKNIK_YONETMEN'];
    const now = new Date();
    // Son 5 dakika içinde aktif olmuş kullanıcılar anlık çevrimiçi (online) kabul edilir
    const ONLINE_THRESHOLD_MS = 5 * 60 * 1000;

    // Sistemdeki tüm aktif Teknik Ekip personellerini getir
    const itStaffList = await prisma.user.findMany({
      where: {
        role: { in: itRoles },
        status: 'ACTIVE',
        id: { not: sender.id },
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        lastActiveAt: true,
        showInLiveChat: true,
        directMessagesEnabled: true,
      },
    });

    if (itStaffList.length === 0) {
      return NextResponse.json({ ok: false, error: 'Aktif Teknik Destek personeli bulunamadı.' }, { status: 404 });
    }

    // Aktiflik ve çevrimiçilik öncelik sıralaması:
    // 1. Şu anda çevrimiçi olanlar (isOnline === true, son 5 dk içinde aktif) en başta
    // 2. Mesaj alımı açık olanlar (directMessagesEnabled !== false)
    // 3. Canlı destekte gösterilsin seçili olanlar (showInLiveChat === true)
    // 4. lastActiveAt tarihi en yeni (en taze) olan
    // 5. Saha / Destek rolü (IT_AGENT > TEKNIK_YONETMEN > TEKNIK_MUDUR > SUPER_ADMIN)
    const scoredList = itStaffList.map((u) => {
      const diff = u.lastActiveAt ? now.getTime() - new Date(u.lastActiveAt).getTime() : Infinity;
      const isOnline = diff < ONLINE_THRESHOLD_MS;
      const isRecent = diff < 30 * 60 * 1000; // Son 30 dakika

      let score = 0;
      if (isOnline) score += 100000; // Şu an kesinlikle aktif/çevrimiçi!
      else if (isRecent) score += 50000; // Yakın zamanda aktifti

      if (u.directMessagesEnabled !== false) score += 10000;
      if (u.showInLiveChat) score += 5000;

      // Operasyonel IT personeli önceliği
      if (u.role === 'IT_AGENT') score += 2000;
      else if (u.role === 'TEKNIK_YONETMEN') score += 1500;
      else if (u.role === 'TEKNIK_MUDUR') score += 1000;
      else if (u.role === 'SUPER_ADMIN') score += 500;

      return { user: u, score, diff, isOnline };
    });

    // En yüksek skora sahip ve en taze aktif olan personel ilk sıraya gelir
    scoredList.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.diff - b.diff;
    });

    const chosen = scoredList[0];
    const recipient = chosen.user;

    // DirectMessage oluştur (Aktif IT personeline atanır)
    await prisma.directMessage.create({
      data: {
        senderId: sender.id,
        recipientId: recipient.id,
        body: message,
      },
    });

    // Ana muhatap aktif personele bildirim oluştur
    await prisma.notification.create({
      data: {
        userId: recipient.id,
        type: 'DIRECT_MESSAGE',
        title: `⚡ Kiosk Hızlı Mesaj: ${sender.name || sender.email}${pcInfo}`,
        body: message.length > 100 ? message.slice(0, 100) + '...' : message,
        link: `/messages/${sender.id}`,
      },
    });

    // Eğer şu an çevrimiçi olan başka teknik personel varsa, masadaki diğer nöbetçilerin de görmesi için bildirim gönder
    const otherOnlineIt = scoredList.filter((s) => s.isOnline && s.user.id !== recipient.id);
    for (const other of otherOnlineIt) {
      prisma.notification.create({
        data: {
          userId: other.user.id,
          type: 'DIRECT_MESSAGE',
          title: `⚡ Kiosk Hızlı Mesaj: ${sender.name || sender.email}${pcInfo}`,
          body: `[Muhatap: ${recipient.name || 'Teknik Ekip'}] ${message.length > 100 ? message.slice(0, 100) + '...' : message}`,
          link: `/messages/${sender.id}`,
        },
      }).catch(() => {});
    }

    return NextResponse.json({
      ok: true,
      recipientName: recipient.name || recipient.email,
      recipientRole: recipient.role,
      isOnline: chosen.isOnline,
    });
  } catch (err: any) {
    console.error('Kiosk quickmsg error:', err);
    return NextResponse.json({ ok: false, error: 'Mesaj gönderilirken hata oluştu.' }, { status: 500 });
  }
}
