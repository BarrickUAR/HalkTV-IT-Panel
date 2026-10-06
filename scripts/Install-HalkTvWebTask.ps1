param(
    [string]$AppPath = "C:\HalkTV\IT-Panel",
    [string]$TaskName = "HalkTV IT Panel",
    [int]$Port = 3000
)

# Yönetici PowerShell ile çalıştırın. Uygulamayı SYSTEM hesabıyla açılışta başlatır.
$ErrorActionPreference = "Stop"
$resolvedApp = (Resolve-Path -LiteralPath $AppPath).Path
if (-not (Test-Path -LiteralPath (Join-Path $resolvedApp "package.json"))) { throw "package.json bulunamadı: $resolvedApp" }
$npm = (Get-Command npm.cmd -ErrorAction Stop).Source
$logDir = Join-Path $resolvedApp "logs"
New-Item -ItemType Directory -Path $logDir -Force | Out-Null

$command = "set PORT=$Port&& cd /d `"$resolvedApp`"&& `"$npm`" start 1>>`"$logDir\server.out.log`" 2>>`"$logDir\server.err.log`""
$action = New-ScheduledTaskAction -Execute "cmd.exe" -Argument "/d /c $command" -WorkingDirectory $resolvedApp
$trigger = New-ScheduledTaskTrigger -AtStartup
$settings = New-ScheduledTaskSettingsSet -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1) -ExecutionTimeLimit (New-TimeSpan -Days 0) -StartWhenAvailable
$principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest
Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Description "HalkTV teknik destek web panelini otomatik başlatır." -Force -ErrorAction Stop | Out-Null
Start-ScheduledTask -TaskName $TaskName -ErrorAction Stop
Write-Host "Kuruldu ve başlatıldı: $TaskName"
