const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (...parts) => fs.readFileSync(path.join(root, ...parts), "utf8");

test("Google OAuth güvenli varsayılan kontrolleri kullanır", () => {
  const source = read("src", "auth.ts");
  assert.doesNotMatch(source, /checks\s*:\s*\[\s*["']none["']/);
  assert.doesNotMatch(source, /allowDangerousEmailAccountLinking\s*:\s*true/);
  assert.match(source, /maxAge:\s*60\s*\*\s*60\s*\*\s*12/);
});

test("yükleme politikası 50 MB ve çalıştırılabilir dosya engeli içerir", () => {
  const source = read("src", "lib", "upload.ts");
  assert.match(source, /50\s*\*\s*1024\s*\*\s*1024/);
  for (const extension of ["exe", "bat", "cmd", "msi", "ps1", "vbs"]) assert.match(source, new RegExp(`"${extension}"`));
  assert.doesNotMatch(source, /"image\/svg\+xml"/);
  assert.match(source, /matchesFileSignature/);
  assert.match(source, /storage["'], ["']uploads/);
});

test("webhook secret yoksa kapalı kalır", () => {
  const source = read("src", "app", "api", "inbound-email", "route.ts");
  assert.match(source, /if\s*\(!secret\)/);
  assert.match(source, /status:\s*503/);
});

test("cihaz komutlarının süresi ve izin listesi vardır", () => {
  const source = read("src", "app", "api", "device-commands", "route.ts");
  assert.match(source, /expiresAt:\s*new Date\(Date\.now\(\) \+ 10 \* 60 \* 1000\)/);
  assert.doesNotMatch(source.match(/ALLOWED_COMMANDS[^;]+/)?.[0] || "", /OPEN_APP|KILL_PROCESS/);
});

test("örnek ortam dosyasında gerçek Google anahtarı bulunmaz", () => {
  const source = read(".env.example");
  assert.doesNotMatch(source, /GOCSPX-/);
  assert.doesNotMatch(source, /\.apps\.googleusercontent\.com/);
});
