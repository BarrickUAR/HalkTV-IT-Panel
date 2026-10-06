# Kiosk 1.1.5 — 6 Ekim 2026

## Düzeltmeler

- Ana ekran açılışı AnyDesk araması veya SMB klasör sayımını beklemez. Klasör sayımı zaman aşımı ve tek çalışan iş sınırıyla yürür.
- Sunucu değişikliği Windows yönetici onayı ister. Eski cihaz anahtarı temizlenir, WebView ve komut servisi birlikte yenilenir.
- Cihaz anahtarları DPAPI CurrentUser ile korunur. Eski ayarlar ilk açılışta dönüştürülür.
- Heartbeat HTTP hataları dönen sınırlı boyutlu bağlantı günlüğüne yazılır; eşzamanlı heartbeat engellenir.
- Çevrimdışı sorumluya atanmış cihaz sohbeti teknik ekibe bildirilir. İki dakika pasif kalan sorumlunun sohbeti başka teknik personelce üstlenilebilir.
- Mesaj bazlı okundu bildirimleri, uzun mesaj görünürlüğü, sayfalama ve gizli pencerede gereksiz sorgular düzenlendi.
- On dakikadan eski okunmamış cihaz uyarıları artık atlanmaz. Kullanıcı giriş yaptıktan sonra cihaz sohbeti erişilebilir kalır.
- Cihaz listesinin yenilenmesi kapatılan konuşmayı yeniden açmaz.
- Kullanıcı tarafından verilen bilgisayar adı tek başına cihaz-kullanıcı eşleştirmesi oluşturmaz.

## Kurulumda tamamlanması gerekenler

- Mevcut ortamla PostgreSQL bağlantısı sağlayıcı tarafından reddediliyor (`XX000`, tenant/user bulunamadı). Geçerli bağlantı sağlanmadan migration ve gerçek mesajlaşma testi tamamlanamaz.
- Kaynakları çekince `npm ci`, geçerli veritabanı ayarlarıyla `npx prisma migrate deploy`, ardından `npm run build` uygulanmalıdır.
- Merkezi HTTPS adresi/sertifikası ve EXE yayıncı imzası kurum altyapısında sağlanmalıdır. İmzasız EXE antivirüs uyumluluğu garantisi vermez.
- 100–120 cihazın gerçek oturum, mesaj, dosya yükleme ve bağlantı yenileme yük testi yapılmalıdır. Mevcut `test:load` yalnızca sağlık uç noktasını ölçer.
- Cihaz kimliği kullanıcı profiline bağlıdır; makine genelinde kurulum ve oturum açılmadan destek için ayrıca servis/provisioning tasarımı gerekir.

## Git kapsamı

C# kaynakları web/API ile birlikte `desktop/HalkTvKiosk` altında sürümlenir. EXE, kişisel config, ortam anahtarları, yüklenmiş kullanıcı dosyaları ve günlükler kaynak paketine dahil edilmez.
