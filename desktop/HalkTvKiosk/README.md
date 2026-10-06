# HalkTV Teknik Destek Kiosk - C# .NET 8 (WebView2)

100-120 bilgisayara Active Directory / GPO üzerinden dağıtılmak üzere geliştirilmiş C# masaüstü istemcisi. Arayüz merkezi web sunucusundan gelir; cihazlarda yalnızca self-contained `HalkTvKiosk.exe` tutulur. WebView2 Runtime Windows'ta kurulu olmalıdır.

---

## 🚀 Hızlı Test (Hemen Denemek İçin)

1. Dağıtım paketindeki `HalkTvKiosk.exe` dosyasını açın.
2. İlk açılışta sunucuya erişim ve WebView2 Runtime kurulumunu kontrol edin.
3. Ekranın sağ alt köşesinde (Windows saatinin yanında) **HalkTV Logosu** belirecek ve Kiosk penceresi doğrudan açılacaktır.

---

## 🎯 Özellikler ve Avantajlar

| Özellik | Eski Electron İstemcisi | Yeni C# .NET WebView2 |
| :--- | :--- | :--- |
| **RAM Tüketimi** | ~120 - 180 MB | WebView2 ile cihaza göre değişir; pilotta ölçülmelidir |
| **Paket** | Klasör tabanlı | **Tek self-contained EXE** |
| **Güncelleme** | Manuel | **GPO başlangıç betiği EXE'yi yeniler** |
| **Cihaz Bilgisi** | Gecikmeli | Yerel Windows API ile okunur; ağ/AnyDesk taraması süreye bağlıdır |
| **Marsis Entegrasyonu**| Kat IP seçimi gerektiriyordu | **Doğrudan `http://news` bağlantısı** |
| **Dağıtım (100 PC)** | Klasör tabanlı | Yaklaşık **16,3 GB toplam EXE kopyası** (cihaz başına 163 MB); GPO yayılımı kademeli yapılmalıdır |

---

## ⚙️ Sunucu Adresi Yapılandırması

Uygulama varsayılan olarak `http://192.168.3.79:3000` adresine bağlanacak şekilde ayarlanmıştır.

Adresi değiştirmek için:
- **Yöntem 1 (Arayüzden):** Sağ alttaki HalkTV simgesine sağ tıklayın -> **"⚙️ Sunucu Adresi Ayarla..."** seçeneğine tıklayıp yeni IP/adresi girin.
- **Yöntem 2 (Dosyadan):** `%APPDATA%\HalkTvKiosk\config.json` dosyasındaki `"ServerUrl"` alanını güncelleyin:
  ```json
  {
    "ServerUrl": "http://192.168.3.79:3000",
    "AutoStartWithWindows": true
  }
  ```

---

## 📡 100 Bilgisayara Domain (GPO) Dağıtımı

Active Directory Group Policy Management üzerinden dağıtmak için:

1. Yayınlanan `HalkTvKiosk.exe` ve `Deploy-GPO.bat` dosyalarını Domain Controller üzerindeki paylaşımlı bir klasöre (örn: `\\dc\netlogon\HalkTvKiosk`) koyun.
2. Group Policy Management Console'u açın.
3. Hedef bilgisayar grubunun GPO ilkesinde:
   **Computer Configuration > Policies > Windows Settings > Scripts (Startup/Shutdown) > Startup**
4. `Deploy-GPO.bat` dosyasını ekleyin.
5. Bilgisayar açılışında yalnızca EXE `C:\Program Files\HalkTV\Kiosk` dizinine kopyalanır. Uygulama SYSTEM oturumunda açılmaz; personel Windows oturumu açtığında HKLM Run kaydıyla görünür şekilde başlar.

GPO başlangıç betiğinin ağ paylaşımına erişebilmesi için ilgili ilkeyi **bilgisayar başlangıcında ağı bekle** seçeneğiyle dağıtın. İlk kez açık bir Windows oturumunda hemen test etmek isterseniz EXE'yi kullanıcının oturumunda elle başlatın; başlangıç betiği SYSTEM oturumundan başlatmaz.

İlk kullanımda personel `@halktv.com.tr` Google hesabıyla giriş yapar. Kiosk kendisine özel cihaz anahtarı alır; heartbeat, cihaz bilgileri, komut sonuçları ve sistem olayları merkezi API/veritabanına yazılır. Üretimde bu anahtarın ağda korunması için HTTPS zorunludur. Sunucu ulaşılamazsa başlangıç tanısı için `%LOCALAPPDATA%\HalkTvKiosk\Logs\startup.log` yerelde tutulur. Bu token alma akışı henüz AD makine kimliğini kriptografik olarak doğrulamaz; büyük dağıtımdan önce IT onaylı cihaz kaydı veya domain kimliği doğrulaması gerekir.

### Giriş yapmamış cihazlarla iletişim (v1.1.4)

- Daha önce cihaz anahtarı almış bir kiosk, kullanıcı hesabı açık olmasa da yöneticinin cihaz sohbetini ve cihaz bildirimlerini alır.
- Yeni bir cihaz için yönetici kioskundaki **Araçlar → Kayıtlı cihazlar → Eşleştirme kodu üret** işlemi 15 dakikalık tek kullanımlık kod oluşturur. Cihaz henüz listede yoksa aynı yerde PC adını elle girip kod üretin. Kod, yalnızca o bilgisayardaki kiosk giriş ekranına girilir.
- Yönetici **Cihaza mesaj / sohbet** ile yazabilir. Yanıtlar kişi hesabına değil cihaza bağlıdır; ekranda Windows kullanıcı adı görünse bile bu kişinin kurumsal kimliğinin doğrulandığı anlamına gelmez.
- Bir cihazın eşleştirme kodu ve cihaz anahtarı şu an HTTP üzerinden taşınmamalıdır. Kurumsal HTTPS, sunucu adı ve sertifika dağıtımı tamamlanmadan bu akışı 100-120 cihaza yaymayın. Mevcut EXE tek başına güvenilir AD makine kimliği kanıtı sağlamaz.
- Cihaz anahtarı şu anda Windows kullanıcı profilindeki `%APPDATA%\HalkTvKiosk\config.json` dosyasındadır. Aynı PC'de başka Windows profiliyle giriş yapılırsa ayrıca eşleştirme gerekir. Makine geneline güvenli kimlik için bir Windows servisi veya AD/Kerberos temelli kayıt akışı tasarlanmalıdır.
