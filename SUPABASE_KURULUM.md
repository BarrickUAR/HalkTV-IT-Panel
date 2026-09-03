# 🚀 HalkTV IT Paneli — Supabase & Gerçek Veritabanı Kurulum Rehberi

Bu rehber, projenin **Demo (Mockup)** modundan çıkarılarak **canlı Supabase PostgreSQL veritabanına** bağlanması için hazırlanmıştır.

---

## ⚠️ Karşılaşılan Hatanın Sebebi ve Çözümü

> **Hata:** `FATAL: (ENOIDENTIFIER) no tenant identifier provided (external_id or sni_hostname required)`

### Hatanın Sebebi:
Supabase Connection Pooler (bağlantı havuzu) portlarını (`6543` veya `5432`) kullanırken, Supabase hangi projeye bağlanıldığını **kullanıcı adı** üzerinden anlar. 
- ❌ **Hatalı Yazım:** `postgresql://postgres:<ref>:<password>@...` (İki nokta veya eksik proje ref)
- ❌ **Hatalı Yazım:** `postgresql://postgres:[password]@aws-0-...pooler.supabase.com:6543/postgres` (Proje ref'i yok)
- ✅ **Doğru Yazım:** `postgresql://postgres.[PROJE_REF]:[SIFRENIZ]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1`

---

## 📌 Adım 1: Supabase Dashboard'dan Bağlantı Bilgilerini Alma

1. [Supabase Dashboard](https://supabase.com/dashboard)'a gidin ve projenizi açın.
2. Sol alttaki **Project Settings** (Dişli çark) simgesine tıklayın.
3. Menüden **Database** sekmesine tıklayın.
4. Sayfayı aşağı kaydırıp **Connection String** bölümüne gelin.
5. Üstteki sekmelerden **URI** seçeneğini seçin:

### A) `DATABASE_URL` İçin (Transaction Mode - Port 6543):
- **Mode:** `Transaction` seçin.
- Format şuna benzer olacaktır:
  ```env
  DATABASE_URL="postgresql://postgres.[PROJE_REF]:[VERITABANI_SIFRENIZ]@aws-0-[BOLGENIZ].pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
  ```

### B) `DIRECT_URL` İçin (Session Mode - Port 5432):
- **Mode:** `Session` seçin.
- Format şuna benzer olacaktır:
  ```env
  DIRECT_URL="postgresql://postgres.[PROJE_REF]:[VERITABANI_SIFRENIZ]@aws-0-[BOLGENIZ].pooler.supabase.com:5432/postgres"
  ```

*(Not: `[VERITABANI_SIFRENIZ]` yerine Supabase projenizi oluştururken belirlediğiniz veritabanı şifrenizi yazın. Şifrenizde `@`, `#`, `$` gibi özel karakterler varsa URL encode edilmelidir).*

---

## 📌 Adım 2: `.env` Dosyasını Güncelleme

Proje ana dizinindeki `.env` dosyasını açın ve şu şekilde güncelleyin:

```env
# ---- DEMO MODUNU KAPATMA (GERÇEK VERİTABANI) ----
DEMO_MODE="false"
NEXT_PUBLIC_DEMO_MODE="false"

# ---- SUPABASE POSTGRESQL BAĞLANTISI ----
DATABASE_URL="postgresql://postgres.[PROJE_REF]:[SIFRE]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"
DIRECT_URL="postgresql://postgres.[PROJE_REF]:[SIFRE]@aws-0-eu-central-1.pooler.supabase.com:5432/postgres"

# ---- NEXTAUTH GÜVENLİK ANAHTARI ----
AUTH_SECRET="halktv-helpdesk-production-secret-2026"
AUTH_TRUST_HOST="true"

# ---- UYGULAMA ADRESİ ----
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

---

## 📌 Adım 3: Tabloları Supabase'e Otomatik Yükleme

Aşağıdaki komutu çalıştırdığınızda; Kullanıcılar, Departmanlar, Bilgisayar Envanteri, Talepler, Bilgi Bankası Makaleleri vb. tüm tablolar otomatik olarak Supabase üzerinde oluşturulur:

```bash
npx prisma db push
```

---

## 📌 Adım 4: Başlangıç Verilerini Yükleme (Seed)

Sisteme ilk Yönetici (Admin) hesabını ve kurumsal departmanları yüklemek için:

```bash
npm run db:seed
```

Bu komut çalıştığında:
- **Varsayılan Departmanlar** açılır: Haber Merkezi, Reji & Yayın, Kurgu & Montaj, Teknik Servis & IT, vb.
- **İlk SUPER_ADMIN Hesabı** oluşturulur:
  - **Kullanıcı Adı:** `admin`
  - **E-posta:** `admin@halktv.com.tr`
  - **Şifre:** `HalkTV2026!`
- **Örnek Cihaz Envanteri** tanımlanır.

---

## 📌 Adım 5: Uygulamayı Başlatma

```bash
npm run dev
```

Artık tarayıcınızda `http://localhost:3000` adresini açıp `admin` / `HalkTV2026!` ile giriş yapabilirsiniz. Tüm verileriniz gerçek Supabase PostgreSQL veritabanında saklanacaktır!
