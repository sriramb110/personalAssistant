param([int]$Port = 8001)
$ErrorActionPreference = 'Stop'
if ($Port -lt 1 -or $Port -gt 65535) { throw 'Port must be between 1 and 65535.' }
$anbuRoot = Split-Path -Parent $PSScriptRoot
$anbuTunnel = Join-Path $anbuRoot '.tools\cloudflared.exe'
if (-not (Test-Path -LiteralPath $anbuTunnel)) {
    throw 'Install the official cloudflared executable into .tools\cloudflared.exe first. See backend/README.md.'
}
$anbuOrigin = "http://127.0.0.1:$Port"
$anbuHealth = Invoke-RestMethod -Uri "$anbuOrigin/health" -TimeoutSec 5
if ($anbuHealth.service -ne 'personal-assistant-api') { throw 'The expected backend is not running at this port.' }
try {
    $anbuResponse = Invoke-WebRequest -Uri "$anbuOrigin/api/v1/assistant/status" -UseBasicParsing -TimeoutSec 5
    throw 'The backend unexpectedly accepted a request without an access key. Do not expose it.'
} catch {
    if ($null -eq $_.Exception.Response -or [int]$_.Exception.Response.StatusCode -ne 401) { throw }
}
Write-Host 'Starting temporary HTTPS access. Copy the printed URL into the app Settings.'
Write-Host 'Keep this terminal open. Ctrl+C closes the public link.'
& $anbuTunnel tunnel --url $anbuOrigin --no-autoupdate
