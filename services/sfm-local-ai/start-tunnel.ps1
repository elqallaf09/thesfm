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

function Resolve-Cloudflared {
  $command = Get-Command cloudflared -ErrorAction SilentlyContinue
  if ($command -and $command.Source) { return $command.Source }

  # winget/MSI can update PATH after the current Windows PowerShell process
  # started, so refresh PATH once before falling back to common install roots.
  $machinePath = [Environment]::GetEnvironmentVariable('Path', 'Machine')
  $userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
  if ($machinePath -or $userPath) {
    $env:Path = @($machinePath, $userPath) -join ';'
    $command = Get-Command cloudflared -ErrorAction SilentlyContinue
    if ($command -and $command.Source) { return $command.Source }
  }

  $candidates = @(
    (Join-Path $env:ProgramFiles 'cloudflared\cloudflared.exe'),
    (Join-Path ${env:ProgramFiles(x86)} 'cloudflared\cloudflared.exe')
  ) | Where-Object { $_ -and (Test-Path $_) }

  if ($candidates.Count -gt 0) { return $candidates[0] }

  $wingetRoot = Join-Path $env:LOCALAPPDATA 'Microsoft\WinGet\Packages'
  if (Test-Path $wingetRoot) {
    $found = Get-ChildItem -Path $wingetRoot -Filter 'cloudflared.exe' -File -Recurse -ErrorAction SilentlyContinue |
      Select-Object -First 1 -ExpandProperty FullName
    if ($found) { return $found }
  }

  return $null
}

$CloudflaredExe = Resolve-Cloudflared
if (-not $CloudflaredExe) {
  Write-Host ""
  Write-Host "cloudflared was not found."
  Write-Host "Install it with:"
  Write-Host "  winget install --id Cloudflare.cloudflared"
  Write-Host ""
  Write-Host "Then open a new PowerShell window and run this script again."
  exit 2
}
Write-Host "cloudflared: $CloudflaredExe"

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

& $CloudflaredExe tunnel --no-autoupdate --url "http://127.0.0.1:$port"
