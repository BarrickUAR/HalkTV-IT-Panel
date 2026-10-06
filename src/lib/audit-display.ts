const actions: Record<string, [string, string]> = {
  DEVICE_CHAT_CLAIM: ["Cihaz sohbeti üstlenildi", "teal"], DEVICE_CHAT_RELEASE: ["Cihaz sohbeti ekibe bırakıldı", "amber"], DEVICE_CHAT_TAKEOVER: ["Cihaz sohbeti devralındı", "violet"],
  DEVICE_PAIRING_CREATED: ["Cihaz eşleştirme kodu oluşturuldu", "blue"], DEVICE_PAIRING_CLAIMED: ["Cihaz eşleştirildi", "green"],
  LOGIN: ["Oturum açıldı", "green"], LOGOUT: ["Oturum kapatıldı", "slate"],
  KIOSK_CONNECTED: ["Kiosk bağlantısı yenilendi", "teal"], KIOSK_DISCONNECTED: ["Kiosk bağlantısı kesildi", "amber"],
  TICKET_CREATED: ["Talep oluşturuldu", "green"], KIOSK_TICKET_CREATED: ["Kiosktan talep oluşturuldu", "green"],
  TICKET_UPDATED: ["Talep güncellendi", "blue"], STATUS_CHANGED: ["Talep durumu değiştirildi", "blue"],
  ASSIGNED: ["Talep atandı", "violet"], COMMENT_ADDED: ["Talep yanıtlandı", "blue"], TIME_LOGGED: ["Çalışma süresi eklendi", "blue"],
  USER_CREATED: ["Kullanıcı oluşturuldu", "violet"], USER_UPDATED: ["Kullanıcı ve yetkileri güncellendi", "violet"],
  PASSWORD_RESET: ["Şifre yenilendi", "amber"], KIOSK_DM_TOGGLED: ["Mesaj alımı değiştirildi", "amber"], DM_TOGGLED: ["Mesaj alımı değiştirildi", "amber"],
  USER_BLOCKED: ["Kullanıcı engellendi", "red"], USER_UNBLOCKED: ["Kullanıcı engeli kaldırıldı", "green"],
  KIOSK_MESSAGE_SENT: ["Kiosktan mesaj gönderildi", "blue"], FILE_UPLOADED: ["Dosya yüklendi", "blue"],
  COMPUTER_CREATED: ["Bilgisayar eklendi", "teal"], COMPUTER_UPDATED: ["Bilgisayar güncellendi", "teal"], COMPUTER_DELETED: ["Bilgisayar silindi", "red"],
  COMPUTER_ASSIGNED: ["Bilgisayar atandı", "teal"], COMPUTER_UNLINKED: ["Bilgisayar ataması kaldırıldı", "amber"],
  COMPUTER_MESSAGE_SENT: ["Cihaza bildirim gönderildi", "blue"], DEVICE_COMMAND_CREATED: ["Cihaz komutu oluşturuldu", "amber"],
  TIGHTVNC_CONNECTION_LAUNCHED: ["TightVNC bağlantısı başlatıldı", "teal"], TIGHTVNC_CONNECTION_REQUESTED: ["TightVNC bağlantısı istendi", "blue"], TIGHTVNC_VIEWER_STARTED: ["TightVNC görüntüleyici açıldı", "teal"], TIGHTVNC_VIEWER_FAILED: ["TightVNC görüntüleyici açılamadı", "red"], AD_COMPUTERS_SYNCED: ["Domain bilgisayarları eşitlendi", "teal"],
  DEPARTMENT_CREATED: ["Departman oluşturuldu", "violet"], DEPARTMENT_UPDATED: ["Departman güncellendi", "violet"], DEPARTMENT_DELETED: ["Departman silindi", "red"],
  ANNOUNCEMENT_CREATED: ["Duyuru yayınlandı", "amber"], ANNOUNCEMENT_UPDATED: ["Duyuru güncellendi", "amber"],
  FEEDBACK_SUBMITTED: ["Geri bildirim iletildi", "violet"], FEEDBACK_READ: ["Geri bildirim incelendi", "green"],
  CREATE: ["Kayıt oluşturuldu", "green"], UPDATE: ["Kayıt güncellendi", "blue"], DELETE: ["Kayıt silindi", "red"],
};
export function auditDisplay(action: string) {
  const [label, tone] = actions[action] || ["Diğer sistem işlemi", "slate"];
  return { label, tone };
}
export const entityLabels: Record<string, string> = { User: "Kullanıcı", Ticket: "Talep", Computer: "Bilgisayar", Message: "Sohbet", DirectMessage: "Sohbet", Department: "Departman", Announcement: "Duyuru", Feedback: "Geri bildirim", DeviceCommand: "Cihaz komutu" };
