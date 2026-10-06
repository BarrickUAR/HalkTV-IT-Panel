"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import { updateFeedbackStatusAction, addFeedbackNoteAction, saveAdminResponseAction } from "./actions";

export function FeedbackAdminActions({
  feedbackId,
  initialStatus,
  initialResponse,
  notes
}: {
  feedbackId: string;
  initialStatus: string;
  initialResponse: string;
  notes: { id: string; content: string; createdAt: string; authorName: string; authorAvatar: string | null }[];
}) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [response, setResponse] = useState(initialResponse);
  const [savingResp, setSavingResp] = useState(false);
  const [noteContent, setNoteContent] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  const handleStatus = async (newStatus: string) => {
    setStatus(newStatus);
    await updateFeedbackStatusAction(feedbackId, newStatus);
    router.refresh();
  };

  const handleSaveResponse = async () => {
    setSavingResp(true);
    await saveAdminResponseAction(feedbackId, response);
    setSavingResp(false);
    router.refresh();
  };

  const handleAddNote = async () => {
    if (!noteContent.trim()) return;
    setSavingNote(true);
    await addFeedbackNoteAction(feedbackId, noteContent);
    setNoteContent("");
    setSavingNote(false);
    router.refresh();
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border bg-card p-5 shadow-sm space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Durum</h3>
        <select
          value={status}
          onChange={(e) => handleStatus(e.target.value)}
          className="w-full rounded-lg border bg-transparent px-3 py-2 text-sm outline-none font-medium focus-visible:ring-1 focus-visible:ring-primary"
        >
          <option value="NEW">Yeni</option>
          <option value="IN_PROGRESS">İnceleniyor</option>
          <option value="RESOLVED">Çözüldü</option>
          <option value="REJECTED">Reddedildi</option>
        </select>
      </div>

      <div className="rounded-2xl border bg-card p-5 shadow-sm space-y-4">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Personele Cevap</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Kullanıcı PIN koduyla sorgulama yaptığında bu cevabı görecektir.
          </p>
        </div>
        <textarea
          value={response}
          onChange={(e) => setResponse(e.target.value)}
          placeholder="Personelin göreceği cevabı yazın..."
          className="w-full rounded-lg border bg-transparent p-3 text-sm outline-none min-h-[100px] resize-y focus-visible:ring-1 focus-visible:ring-primary"
        />
        <Button onClick={handleSaveResponse} disabled={savingResp} size="sm" className="w-full">
          {savingResp ? "Kaydediliyor..." : "Cevabı Kaydet"}
        </Button>
      </div>

      <div className="rounded-2xl border bg-card shadow-sm flex flex-col overflow-hidden h-[400px]">
        <div className="p-4 border-b bg-muted/20">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">İç Notlar (Sadece IT)</h3>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {notes.length === 0 ? (
            <p className="text-xs text-center text-muted-foreground mt-4">Henüz not eklenmemiş.</p>
          ) : (
            notes.map(n => (
              <div key={n.id} className="bg-muted/40 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold">{n.authorName}</span>
                  <span className="text-[10px] text-muted-foreground">
                    {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true, locale: tr })}
                  </span>
                </div>
                <p className="text-xs text-foreground/80 leading-relaxed whitespace-pre-wrap">{n.content}</p>
              </div>
            ))
          )}
        </div>
        <div className="p-4 border-t bg-muted/20 space-y-2">
          <textarea
            value={noteContent}
            onChange={(e) => setNoteContent(e.target.value)}
            placeholder="Kendi aranızda not bırakın..."
            className="w-full rounded-lg border bg-background p-2.5 text-xs outline-none min-h-[60px] resize-none focus-visible:ring-1 focus-visible:ring-primary"
          />
          <Button onClick={handleAddNote} disabled={savingNote || !noteContent.trim()} size="sm" className="w-full">
            {savingNote ? "Ekleniyor..." : "Not Ekle"}
          </Button>
        </div>
      </div>
    </div>
  );
}
