# Girişsiz cihazlarla iletişim — 21 Eylül 2026

## Uygulanan akış

1. Yönetici kioskunda **Araçlar → Kayıtlı cihazlar** bölümünden bir PC seçilir. Cihaz yoksa PC adı elle girilir.
2. Daha önce kaydedilmemiş cihaz için 12 karakterlik, 15 dakika geçerli, tek kullanımlık eşleştirme kodu üretilir. Veritabanında kodun yalnızca SHA-256 özeti tutulur.
3. Kod hedef PC'deki C# kioskun giriş ekranına girilir. Sunucu o bilgisayara özel cihaz anahtarı verir. Başka bir cihaz adını yazmak tek başına erişim sağlamaz.
4. Yönetici **Cihaza mesaj / sohbet** alanından yazabilir. Mesaj cihaz kaydına bağlıdır; kurumsal kullanıcı oturumu olmasa da cihazın gelen kutusunda görünür. Cihazdaki kişi aynı yerden yanıtlayabilir.
5. Yeni cihaz mesajı tüm etkin IT yöneticilerine bildirim olarak düşer. Bildirimden ilgili bilgisayarın sohbetine geçilir. Okunmamış sayısı cihaz listesinde görünür; sohbette gönderildi/görüldü durumu vardır.
6. Kayıtlı cihaz bildirimleri de Google oturumu olmasa bile cihaz anahtarıyla alınır. Canlı olay bağlantısı ve 45 saniyelik yedek sorgu kullanılır.

## Bilerek ayrı tutulan kimlikler

Personel sohbeti bir Google hesabındaki kişiyle yapılır. Cihaz sohbeti ise belirli bilgisayardaki *o anki kullanıcıyla* yapılır; Windows kullanıcı adı görünse bile kişi kimliği doğrulanmış sayılmaz. Cihaz sohbetinden kişisel talep, profil veya dosyalara erişim verilmez. PC kapalıysa mesaj saklanır, kiosk yeniden açıldığında görünür. Windows oturumu hiç açılmamış bir PC'de kullanıcıya ekran göstermek için ayrıca sistem servisi veya Windows oturum açma ekranı entegrasyonu gerekir.

## Güvenlik ve dağıtım sınırları

- Şu anki `http://192.168.3.79:3000` adresi cihaz anahtarını ve eşleştirme kodunu ağda korumaz. 100–120 PC dağıtımından önce kurumsal HTTPS ve güvenilir sertifika zorunludur.
- C# istemci cihaz anahtarını mevcut Windows profilinde `%APPDATA%\HalkTvKiosk\config.json` içinde tutar. Aynı PC'deki farklı Windows profili ayrı eşleştirme ister. Makine düzeyinde güvenli kimlik için Windows servisi/AD-Kerberos tabanlı çözüm gerekir.
- Elle kod eşleştirme pilot için uygundur; 100–120 PC için AD bilgisayar hesabıyla otomatik, IT onaylı kayıt akışı gerekir. Sadece EXE, AD makine kimliğini kanıtlamaz.
- Bu sunucu hâlen teknik yönetmenin PC'sinde elle başlatılıyor; veritabanı uzaktaki PostgreSQL'dir. Domain sunucusuna taşınmış veya servis olarak kalıcı kurulmuş değildir.
- EXE henüz kod imzalı değil. Comodo/Xcitium onayı, GPO pilotu, farklı Windows profilleri ve 100+ cihazla gerçek sohbet/yük testi tamamlanmadı.
- Cihaz sohbeti şu an metin tabanlıdır; dosya aktarma ve kişiye özel gizlilik için Google oturumlu destek sohbeti kullanılmalıdır.

## Bu turdaki doğrulama

Prisma şeması, TypeScript ve C# derlemesi başarılı; mevcut testler 8/8 geçti. Geçici test PC'siyle kod üretme/eşleştirme, cihazdan yöneticiye mesaj, yönetici yanıtı ve gelen kutusu uçtan uca doğrulandı. Son testte cihaz mesajı üç etkin IT yöneticisine bildirim oluşturdu. Test PC ve bildirim kayıtları kaldırıldı; denetim kayıtları test izi olarak kaldı.

Veritabanı ekleri `prisma/migrations/20260921181500_device_chat_and_pairing/migration.sql` içinde kayıtlıdır. Çalışan veritabanına şema eşitlemesi uygulanmış, migration aynı veritabanında uygulanmış olarak işaretlenmiştir; `prisma migrate status` güncel durum gösterir.
