import { requireUser } from '@/lib/auth-helpers';
import { isITStaff } from '@/lib/rbac/permissions';
import { redirect } from 'next/navigation';
import fs from 'fs';
import path from 'path';
import Image from 'next/image';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Uzak Ekran Görüntüleri' };
export const dynamic = 'force-dynamic';

export default async function ScreenshotsPage() {
  const user = await requireUser();
  if (!isITStaff(user.role)) redirect('/dashboard');

  const dir = path.join(process.cwd(), 'storage', 'screenshots');
  let files: { name: string; url: string; mtime: Date }[] = [];

  try {
    if (fs.existsSync(dir)) {
      files = fs.readdirSync(dir)
        .filter(f => f.endsWith('.png'))
        .map(f => ({
          name: f,
          url: `/api/screenshots/${f}`,
          mtime: fs.statSync(path.join(dir, f)).mtime,
        }))
        .sort((a, b) => b.mtime.getTime() - a.mtime.getTime())
        .slice(0, 50); // Son 50 görüntü
    }
  } catch {}

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">📸 Uzak Ekran Görüntüleri</h1>
        <p className="text-sm text-muted-foreground mt-1">
          IT personeli tarafından Kiosk üzerinden alınan anlık ekran görüntüleri.
        </p>
      </div>

      {files.length === 0 ? (
        <div className="text-center py-20 border rounded-xl bg-card border-dashed">
          <p className="text-muted-foreground">Henüz hiçbir ekran görüntüsü alınmamış.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {files.map(f => {
            const pcName = f.name.replace(/\.png$/, '').replace('screenshot-', '').split('-')[0];
            return (
              <div key={f.name} className="rounded-xl border bg-card overflow-hidden shadow-xs hover:shadow-md transition-shadow group relative">
                <a href={f.url} target="_blank" rel="noreferrer" className="block relative aspect-video bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={f.url}
                    alt={f.name}
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                </a>
                <div className="p-4">
                  <h3 className="font-semibold text-sm truncate" title={pcName}>{pcName}</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {f.mtime.toLocaleString('tr-TR', {
                      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
