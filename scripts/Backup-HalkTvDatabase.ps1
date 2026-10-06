param(
    [string]$BackupDirectory = "C:\HalkTV\Backups",
    [int]$RetentionDays = 30
)

$ErrorActionPreference = "Stop"
if ([string]::IsNullOrWhiteSpace($env:DIRECT_URL)) { throw "DIRECT_URL ortam değişkeni tanımlı değil." }
$pgDump = (Get-Command pg_dump.exe -ErrorAction Stop).Source
New-Item -ItemType Directory -Path $BackupDirectory -Force | Out-Null
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$target = Join-Path $BackupDirectory "halktv-helpdesk-$stamp.dump"
& $pgDump --format=custom --no-owner --no-acl --file=$target $env:DIRECT_URL
if ($LASTEXITCODE -ne 0 -or -not (Test-Path -LiteralPath $target)) { throw "Veritabanı yedeği alınamadı." }
Get-ChildItem -LiteralPath $BackupDirectory -Filter "halktv-helpdesk-*.dump" -File |
    Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-$RetentionDays) } |
    Remove-Item -Force
Write-Host "Yedek tamamlandı: $target"
