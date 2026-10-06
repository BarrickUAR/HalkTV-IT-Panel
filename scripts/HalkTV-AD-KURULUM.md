# HalkTV Active Directory Envanter Bağlantısı

Bu yöntem Active Directory'ye hiçbir kayıt yazmaz. Yalnızca `Get-ADComputer` ile bilgisayar nesnelerini okur. OU, GPO, kullanıcı, bilgisayar hesabı ve parola üzerinde değişiklik yapmaz.

## 1. Güvenli ön kontrol

Domain Controller'a veya RSAT/ActiveDirectory PowerShell modülü bulunan bir yönetim sunucusuna bu klasörü kopyalayın. Normal bir domain hesabıyla PowerShell açın; Domain Admin gerekmez.

```powershell
Get-Module -ListAvailable ActiveDirectory
Get-ADDomain
Get-ADComputer -Filter * -ResultSetSize 5 | Select-Object Name,Enabled
```

## 2. Yalnızca önizleme oluşturun

Bu komut HalkTV paneline veri göndermez:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\Sync-HalkTvActiveDirectory.ps1 -SearchBase "DC=TYT,DC=LOCAL" -ResolveIpAddresses -PreviewOnly
```

`HalkTV-AD-Onizleme` klasöründe CSV ve JSON oluşur. Cihaz sayısı, adlar, OU ve IP sonuçlarını kontrol edin.

## 3. Panel erişimini kontrol edin

```powershell
Test-NetConnection 192.168.3.79 -Port 3000
Invoke-RestMethod http://192.168.3.79:3000/api/health
```

İki kontrol de başarılı olmadan senkronizasyonu başlatmayın.

## 4. İlk gerçek senkronizasyon

Panelin `.env` dosyasındaki `AD_SYNC_SECRET` ile aşağıdaki ortam değişkeni aynı olmalıdır. Gizli değeri betiğin içine yazmayın.

```powershell
$env:HALKTV_AD_SYNC_SECRET = "<gizli-değer>"
.\Sync-HalkTvActiveDirectory.ps1 -ServerUrl "http://192.168.3.79:3000" -SearchBase "DC=TYT,DC=LOCAL" -ResolveIpAddresses
```

Çıktıda `ok: true`, `imported` ve `skipped` değerleri görülür. İşlem yalnızca HalkTV panelinin veritabanına ekleme/güncelleme yapar; Active Directory değişmez.

## 5. Zamanlama

İlk manuel kontrol başarılı olduktan sonra betiği 15 dakikada bir çalışacak Görev Zamanlayıcı görevine bağlayın. Ayrı bir salt-okunur servis hesabı veya tercihen gMSA kullanın. Parolayı `.ps1`, `.bat` veya ortak klasörde saklamayın.

## Geri alma

Senkronizasyonu durdurmak için zamanlanmış görevi devre dışı bırakmanız yeterlidir. Active Directory tarafında geri alınacak değişiklik oluşmaz.
