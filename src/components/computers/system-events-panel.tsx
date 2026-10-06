'use client';

import { useState, useEffect } from 'react';
import { HiOutlineListBullet, HiOutlineXMark } from 'react-icons/hi2';

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Az önce';
  if (mins < 60) return `${mins} dk önce`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} saat önce`;
  return `${Math.floor(hours / 24)} gün önce`;
}

function getEventIcon(type: string) {
  switch (type) {
    case 'BOOT': return '🟢';
    case 'SHUTDOWN': return '🔴';
    case 'LOCK': return '🔒';
    case 'UNLOCK': return '🔓';
    case 'PROCESS_CRASH': return '🚨';
    case 'SLEEP': return '💤';
    case 'WAKE': return '☀️';
    case 'LOGON': return '👤';
    case 'LOGOFF': return '👋';
    default: return '🔹';
  }
}

export function SystemEventsPanel({ computerName }: { computerName: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    let mounted = true;

    async function load() {
      setLoading(true);
      setError('');
      try {
        const res = await fetch(`/api/system-events?hostname=${encodeURIComponent(computerName)}&limit=30`);
        if (!res.ok) throw new Error('Veri çekilemedi');
        const data = await res.json();
        if (mounted) setEvents(data.events || []);
      } catch (e: any) {
        if (mounted) setError(e.message);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    return () => { mounted = false; };
  }, [isOpen, computerName]);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
        title="Sistem Olayları (Log)"
      >
        <HiOutlineListBullet className="w-5 h-5" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-background rounded-xl shadow-xl w-full max-w-lg flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <HiOutlineListBullet className="w-5 h-5" />
                {computerName} — Olay Geçmişi
              </h2>
              <button onClick={() => setIsOpen(false)} className="p-1 rounded-md hover:bg-muted">
                <HiOutlineXMark className="w-5 h-5" />
              </button>
            </div>

            <div className="p-0 overflow-y-auto flex-1">
              {loading ? (
                <div className="p-8 text-center text-muted-foreground">Loglar yükleniyor...</div>
              ) : error ? (
                <div className="p-8 text-center text-red-500">{error}</div>
              ) : events.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">Henüz sistem olayı kaydedilmemiş.</div>
              ) : (
                <div className="divide-y">
                  {events.map((ev) => (
                    <div key={ev.id} className="p-4 hover:bg-muted/30 transition-colors flex gap-3">
                      <div className="text-2xl mt-0.5">{getEventIcon(ev.eventType)}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-1">
                          <span className="font-medium text-sm">{ev.eventType}</span>
                          <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                            {relativeTime(ev.createdAt)}
                          </span>
                        </div>
                        {ev.detail && (
                          <p className="text-xs text-muted-foreground break-words" title={ev.detail}>
                            {ev.detail}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
