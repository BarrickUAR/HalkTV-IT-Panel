'use client';

import { useState } from 'react';
import { HiOutlineBolt, HiOutlineXMark } from 'react-icons/hi2';

const COMMANDS = [
  { type: 'RESTART', label: 'Yeniden Başlat', icon: '🔄', color: 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100', needsPayload: false },
  { type: 'SHUTDOWN', label: 'Kapat', icon: '⏹️', color: 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100', needsPayload: false },
  { type: 'RELOAD_KIOSK', label: 'Kiosk Yenile', icon: '🔁', color: 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100', needsPayload: false },
  { type: 'LOCK_SCREEN', label: 'Ekranı Kilitle', icon: '🔒', color: 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100', needsPayload: false },
  { type: 'SHOW_MESSAGE', label: 'Mesaj Göster', icon: '📢', color: 'bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100', needsPayload: true, placeholder: 'Gösterilecek mesajı yazın...' },
  { type: 'FLUSH_DNS', label: 'DNS Temizle', icon: '🧹', color: 'bg-cyan-50 border-cyan-200 text-cyan-700 hover:bg-cyan-100', needsPayload: false },
  { type: 'RESET_SPOOLER', label: 'Yazıcı Sıfırla', icon: '🖨️', color: 'bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100', needsPayload: false },
  { type: 'RENEW_IP', label: 'IP Yenile', icon: '📶', color: 'bg-teal-50 border-teal-200 text-teal-700 hover:bg-teal-100', needsPayload: false },
  { type: 'MUTE_AUDIO', label: 'Sesi Kapat', icon: '🔇', color: 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100', needsPayload: false },
  { type: 'UNMUTE_AUDIO', label: 'Sesi Aç', icon: '🔊', color: 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100', needsPayload: false },
  { type: 'SLEEP', label: 'Uyku Moduna Al', icon: '💤', color: 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100', needsPayload: false },
  { type: 'TAKE_SCREENSHOT', label: 'Ekran Görüntüsü', icon: '📸', color: 'bg-pink-50 border-pink-200 text-pink-700 hover:bg-pink-100', needsPayload: false },
];

export function RemoteCommandDialog({ computerName }: { computerName: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [payload, setPayload] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{type: 'success' | 'error', text: string} | null>(null);

  const selectedCommand = COMMANDS.find(c => c.type === selectedType);
  const canSubmit = selectedCommand && (!selectedCommand.needsPayload || payload.trim() !== '');

  async function handleSend() {
    if (!canSubmit) return;
    setLoading(true);
    setStatusMsg(null);

    try {
      const res = await fetch('/api/device-commands', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ computerName, type: selectedType, payload }),
      });

      if (!res.ok) throw new Error('Komut gönderilemedi');

      setStatusMsg({ type: 'success', text: '✅ Komut gönderildi! Kiosk 30 saniye içinde işleyecek.' });
      setTimeout(() => {
        setIsOpen(false);
        setSelectedType(null);
        setPayload('');
        setStatusMsg(null);
      }, 3000);
    } catch (e: any) {
      setStatusMsg({ type: 'error', text: e.message || 'Bir hata oluştu' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
        title="Uzak Komut Gönder"
      >
        <HiOutlineBolt className="w-5 h-5" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-background rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-semibold flex items-center gap-2">
                <HiOutlineBolt className="w-5 h-5 text-amber-500" />
                {computerName} — Uzaktan Komut Gönder
              </h2>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-md hover:bg-muted"
              >
                <HiOutlineXMark className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {COMMANDS.map(cmd => (
                  <button
                    key={cmd.type}
                    onClick={() => {
                      setSelectedType(cmd.type);
                      setPayload('');
                      setStatusMsg(null);
                    }}
                    className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-all ${
                      selectedType === cmd.type
                        ? `ring-2 ring-offset-1 ring-primary ${cmd.color}`
                        : `hover:bg-muted/50`
                    }`}
                  >
                    <span className="text-2xl mb-1">{cmd.icon}</span>
                    <span className="text-xs font-medium text-center leading-tight">{cmd.label}</span>
                  </button>
                ))}
              </div>

              {selectedCommand?.needsPayload && (
                <div className="mt-4 p-4 border rounded-lg bg-muted/30">
                  <label className="block text-sm font-medium mb-1">
                    Komut Parametresi / Mesaj:
                  </label>
                  <input
                    type="text"
                    value={payload}
                    onChange={e => setPayload(e.target.value)}
                    placeholder={selectedCommand.placeholder}
                    className="w-full px-3 py-2 border rounded-md"
                    autoFocus
                  />
                </div>
              )}

              {statusMsg && (
                <div className={`p-3 rounded-md text-sm font-medium ${statusMsg.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                  {statusMsg.text}
                </div>
              )}
            </div>

            <div className="p-4 border-t bg-muted/20 flex justify-end gap-2">
              <button
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 rounded-md hover:bg-muted font-medium text-sm"
              >
                İptal
              </button>
              <button
                onClick={handleSend}
                disabled={!canSubmit || loading}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 font-medium text-sm disabled:opacity-50 flex items-center gap-2"
              >
                {loading ? 'Gönderiliyor...' : 'Komutu Çalıştır'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
