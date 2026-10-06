param(
    [string]$ServerUrl = "",
    [string]$SearchBase = "",
    [switch]$ResolveIpAddresses,
    [switch]$PreviewOnly,
    [string]$OutputDirectory = ".\HalkTV-AD-Onizleme"
)

$ErrorActionPreference = "Stop"
Import-Module ActiveDirectory -ErrorAction Stop

$properties = @("OperatingSystem", "DNSHostName", "DistinguishedName", "Enabled", "LastLogonDate")
$query = @{ Filter = "*"; Properties = $properties }
if (-not [string]::IsNullOrWhiteSpace($SearchBase)) { $query.SearchBase = $SearchBase }

$domain = (Get-ADDomain).DNSRoot
$items = @(Get-ADComputer @query | Where-Object { $_.Enabled } | ForEach-Object {
    $ip = $null
    if ($ResolveIpAddresses -and $_.DNSHostName) {
        try { $ip = (Resolve-DnsName $_.DNSHostName -Type A -ErrorAction Stop | Select-Object -First 1).IPAddress } catch { }
    }
    [ordered]@{
        name = $_.Name
        domain = $domain
        organizationalUnit = ($_.DistinguishedName -replace '^CN=[^,]+,', '')
        ipAddress = $ip
        operatingSystem = $_.OperatingSystem
        lastLogonAt = if ($_.LastLogonDate) { $_.LastLogonDate.ToUniversalTime().ToString("o") } else { $null }
    }
})

if ($PreviewOnly) {
    New-Item -ItemType Directory -Path $OutputDirectory -Force | Out-Null
    $csvPath = Join-Path $OutputDirectory "domain-cihazlari.csv"
    $jsonPath = Join-Path $OutputDirectory "domain-cihazlari.json"
    $items | Export-Csv -Path $csvPath -NoTypeInformation -Encoding UTF8
    @{ generatedAt = (Get-Date).ToUniversalTime().ToString("o"); domain = $domain; count = $items.Count; computers = $items } |
        ConvertTo-Json -Depth 6 | Set-Content -Path $jsonPath -Encoding UTF8
    [pscustomobject]@{ Mode = "PreviewOnly"; Domain = $domain; ComputerCount = $items.Count; Csv = (Resolve-Path $csvPath).Path; Json = (Resolve-Path $jsonPath).Path } | Format-List
    exit 0
}

if ([string]::IsNullOrWhiteSpace($ServerUrl)) { throw "ServerUrl zorunludur. Önce güvenli test için -PreviewOnly kullanabilirsiniz." }
$syncSecret = $env:HALKTV_AD_SYNC_SECRET
if ([string]::IsNullOrWhiteSpace($syncSecret)) { throw "HALKTV_AD_SYNC_SECRET ortam değişkeni tanımlı değil." }

$body = @{ computers = @($items) } | ConvertTo-Json -Depth 5
$endpoint = "$($ServerUrl.TrimEnd('/'))/api/ad-computers/import"
$result = Invoke-RestMethod -Uri $endpoint -Method Post -ContentType "application/json; charset=utf-8" -Headers @{ "X-AD-Sync-Secret" = $syncSecret } -Body ([Text.Encoding]::UTF8.GetBytes($body))
$result | ConvertTo-Json -Depth 5
