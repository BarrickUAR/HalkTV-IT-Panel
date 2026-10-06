import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const callbackUrl = req.nextUrl.searchParams.get("callbackUrl") || "/kiosk";

  const html = `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>HalkTV - Google ile Giriş Yap</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: #0f172a;
      color: #f8fafc;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100vh;
      user-select: none;
    }
    .spinner {
      width: 38px;
      height: 38px;
      border: 3px solid rgba(255, 255, 255, 0.15);
      border-top-color: #c8102e;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
      margin-bottom: 16px;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    .text {
      font-size: 13px;
      font-weight: 600;
      letter-spacing: 0.2px;
    }
    .sub {
      font-size: 11px;
      color: #94a3b8;
      margin-top: 6px;
    }
  </style>
</head>
<body>
  <div class="spinner"></div>
  <div class="text">Google ile güvenli oturum açılıyor...</div>
  <div class="sub">Lütfen bekleyin</div>

  <form id="authForm" method="POST" action="/api/auth/signin/google" style="display:none;">
    <input type="hidden" name="csrfToken" id="csrfToken" value="" />
    <input type="hidden" name="callbackUrl" value="${callbackUrl.replace(/"/g, "&quot;")}" />
  </form>

  <script>
    (async () => {
      try {
        const res = await fetch('/api/auth/csrf');
        const data = await res.json();
        if (data && data.csrfToken) {
          document.getElementById('csrfToken').value = data.csrfToken;
          document.getElementById('authForm').submit();
        } else {
          document.querySelector('.text').innerText = 'CSRF belirteci alınamadı.';
        }
      } catch (err) {
        document.querySelector('.text').innerText = 'Bağlantı hatası oluştu.';
      }
    })();
  </script>
</body>
</html>`;

  return new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
