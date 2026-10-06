# HalkTV IT Panel — üretim dağıtım notları

## Web sunucusu

1. Node.js LTS ve PostgreSQL istemci araçlarını kurun.
2. Projeyi `C:\HalkTV\IT-Panel` altına kopyalayın; `.env` dosyasını yalnızca yöneticiler okuyabilsin.
3. `npm ci`, `npx prisma migrate deploy`, `npm run build` çalıştırın.
4. Yönetici PowerShell'de `scripts\Install-HalkTvWebTask.ps1` çalıştırın.
5. İzleme sistemi `GET /api/health` için alarm üretmelidir.

Mevcut geliştirme kurulumunda web/API `192.168.3.79:3000` üzerinde elle çalıştırılıyor ve `.env` uzak PostgreSQL veritabanına bağlı. Logların gerçekten domain sunucusunda tutulması isteniyorsa yalnız EXE dağıtımı yeterli değildir: web/API, PostgreSQL, dosya depolama ve yedekleme sunucu tarafında ayrıca kurulup taşınmalıdır. Bu taşıma yapılana kadar cihazlardan gelen loglar merkezi API üzerinden mevcut uzak veritabanına kaydedilir.

## Active Directory bilgisayarları

`AD_SYNC_SECRET` ile `HALKTV_AD_SYNC_SECRET` aynı güçlü rastgele değer olmalıdır. RSAT/AD modülü bulunan domain sunucusunda:

```powershell
$env:HALKTV_AD_SYNC_SECRET = "<gizli-değer>"
.\scripts\Sync-HalkTvActiveDirectory.ps1 -ServerUrl "https://destek.halktv.local" -ResolveIpAddresses
```

Bu komutu Görev Zamanlayıcı ile 15 dakikada bir çalıştırın. AD cihazları yönetici kioskunda görünür; heartbeat almayanlarda `Kiosk kurulmamış` yazar.

## Tek EXE ve cihaz kimlikleri

İstemci self-contained tek EXE olarak GPO ile `C:\Program Files\HalkTV\Kiosk\HalkTvKiosk.exe` konumuna dağıtılır. Yeni cihaz için yönetici kioskunda eşleştirme kodu oluşturulur ve ilgili cihazda girilir. `KIOSK_ALLOW_SELF_ENROLL=false` varsayılanında yalnızca kullanıcı girişi cihaz kaydı oluşturmaz. Ortak API anahtarı EXE içine gömülmez. Pilot cihazlarda `Cihaz kimliği: Etkin` doğrulandıktan sonra `.env` içinde `KIOSK_ALLOW_LEGACY_SECRET=false` kullanın.

1.1.5 istemci cihaz anahtarını Windows DPAPI ile mevcut Windows kullanıcısına bağlı olarak korur. Eski düz metin ayarlar ilk açılışta dönüştürülür. Başka kullanıcı profiline config kopyalamayın; o profilde yeniden eşleştirme gerekir. Sunucu adresini değiştirmek Windows yönetici onayı ister, eski cihaz anahtarını temizler ve bağlantı servislerini yeniden oluşturur. Dağıtım adresi istemcilerin erişebildiği merkezi sunucu olmalıdır; `localhost` yalnızca geliştirme bilgisayarı içindir.

C# kaynakları `desktop/HalkTvKiosk` altındadır. Yayın komutu:

```powershell
dotnet publish desktop/HalkTvKiosk/HalkTvClient.csproj -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true -p:IncludeNativeLibrariesForSelfExtract=true -o artifacts/kiosk
```

WebView2 Runtime uç bilgisayarlarda bulunmalıdır. EXE'nin kod imzası ayrıca kurumun yayıncı sertifikasıyla atılmalıdır; self-contained yayın bu iki koşulu karşılamaz.

Heartbeat, donanım/ağ bilgileri, uzaktan komut sonuçları, bağlantı talepleri ve uygulama olayları API üzerinden merkezi veritabanına yazılır. Sunucu erişilemediğinde teşhis edilebilmesi için yalnızca başlangıç günlüğü cihazda `%LOCALAPPDATA%\HalkTvKiosk\Logs\startup.log` altında kalır.

## HTTPS

IIS/ARR veya kurumun reverse proxy'sinde `https://destek.halktv.local` tanımlayın. Kurum CA sertifikasını GPO ile bilgisayarlara dağıtın ve kiosk `ServerUrl` değerini HTTPS adresine taşıyın. HTTP kullanımına devam edilirken cihaz tokenları ağ üzerinde korunmuş sayılmaz.

## Yedekleme

Sunucu düzeyinde `DIRECT_URL` ortam değişkenini tanımlayın ve `scripts\Install-HalkTvBackupTask.ps1` çalıştırın. Yedekler varsayılan olarak günlük alınır ve 30 gün tutulur. Ayda en az bir kez ayrı bir test veritabanına `pg_restore` ile geri yükleme testi yapın.

## Kod imzası ve Xcitium

EV/OV code-signing sertifikası olmadan kalıcı allowlist güvenli bir çözüm değildir. İmzalı EXE'nin yayıncı sertifikasını Xcitium trusted vendor/publisher politikasına ekleyin. Hash tabanlı kural her yeni sürümde değişeceği için yalnızca geçici pilotta kullanılmalıdır.
