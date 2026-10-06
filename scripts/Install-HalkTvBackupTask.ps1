param(
    [string]$AppPath = "C:\HalkTV\IT-Panel",
    [string]$TaskName = "HalkTV Veritabanı Yedeği",
    [string]$BackupDirectory = "C:\HalkTV\Backups"
)

$ErrorActionPreference = "Stop"
$scriptPath = Join-Path $AppPath "scripts\Backup-HalkTvDatabase.ps1"
if (-not (Test-Path -LiteralPath $scriptPath)) { throw "Yedek betiği bulunamadı: $scriptPath" }
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$scriptPath`" -BackupDirectory `"$BackupDirectory`""
$trigger = New-ScheduledTaskTrigger -Daily -At 2:30am
$settings = New-ScheduledTaskSettingsSet -StartWhenAvailable -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 10)
$principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest
Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -Principal $principal -Description "HalkTV HelpDesk PostgreSQL günlük yedeği" -Force | Out-Null
Write-Host "Günlük yedek görevi kuruldu: $TaskName"
