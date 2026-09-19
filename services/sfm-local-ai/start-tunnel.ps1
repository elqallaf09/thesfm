$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$EnvFile = Join-Path $Root ".env.local"

if (-not (Test-Path $EnvFile)) {
  throw "Run start.ps1 first so services/sfm-local-ai/.env.local exists."
}

$settings = @{}
Get-Content $EnvFile | ForEach-Object {
  $line = $_.Trim()
  if (-not $line -or $line.StartsWith('#')) { return }
  $parts = $line -split '=', 2
  if ($parts.Count -eq 2) { $settings[$parts[0].Trim()] = $parts[1].Trim() }
}

$port = $settings['SFM_LOCAL_GATEWAY_PORT']
if (-not $port) { $port = '8787' }
if ($port -notmatch '^\d{2,5}$') { throw "Invalid SFM_LOCAL_GATEWAY_PORT." }

if (-not (Get-Command cloudflared -ErrorAction SilentlyContinue)) {
  Write-Host ""
  Write-Host "cloudflared is not installed."
  Write-Host "Install it with:"
  Write-Host "  winget install --id Cloudflare.cloudflared"
  Write-Host ""
  Write-Host "Then reopen PowerShell and run this script again."
  exit 2
}

try {
  Invoke-WebRequest -Uri "http://127.0.0.1:$port/v1/models" -Method Get -TimeoutSec 5 -UseBasicParsing | Out-Null
} catch {
  $status = $null
  if ($_.Exception.Response -and $_.Exception.Response.StatusCode) {
    try { $status = [int]$_.Exception.Response.StatusCode } catch { $status = $null }
  }
  if ($status -ne 401) {
    throw "SFM Local AI gateway is not reachable on http://127.0.0.1:$port. Keep start.ps1 running first."
  }
}

Write-Host ""
Write-Host "Starting a temporary Cloudflare HTTPS tunnel to SFM Local AI..."
Write-Host "Only the authenticated gateway on port $port is exposed. Ollama stays private on loopback."
Write-Host ""
Write-Host "When cloudflared prints an https://*.trycloudflare.com URL, use it in Vercel Preview as:"
Write-Host "  SFM_AI_BASE_URL=https://<your-tunnel-host>/v1"
Write-Host "  SFM_AI_MODEL=sfm-local-primary"
Write-Host "  SFM_AI_API_KEY=<value from services/sfm-local-ai/.env.local>"
Write-Host "  SFM_AI_TIMEOUT_MS=22000"
Write-Host ""
Write-Host "Do not paste SFM_AI_API_KEY into chat or a public issue."
Write-Host "Keep this PowerShell window open while Preview is using your PC."
Write-Host ""

& cloudflared tunnel --no-autoupdate --url "http://127.0.0.1:$port"
