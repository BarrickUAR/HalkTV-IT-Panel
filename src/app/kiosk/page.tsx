import KioskClient from "./kiosk-client";

export default function KioskPage() {
  // Session artik kiosk-client.tsx icerisinde /api/kiosk-session araciligiyla cekiliyor.
  // Kiosk penceresi farkli session context'te oldugundan server-side auth() null donebilir.
  return <KioskClient currentUser={null} />;
}
