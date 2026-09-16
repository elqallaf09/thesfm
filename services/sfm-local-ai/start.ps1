param(
  [string]$Model = "qwen3:8b-q4_K_M"
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$EnvFile = Join-Path $Root ".env.local"

function Require-Command([string]$Name, [string]$InstallHint) {
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "$Name is not installed. $InstallHint"
  }
}

function Wait-Ollama {
  for ($i = 0; $i -lt 20; $i++) {
    try {
      Invoke-RestMethod -Uri "http://127.0.0.1:11434/api/tags" -Method Get -TimeoutSec 2 | Out-Null
      return
    } catch {
      Start-Sleep -Milliseconds 500
    }
  }
  throw "Ollama did not become ready on http://127.0.0.1:11434"
}

Require-Command "nvidia-smi" "Install/update the NVIDIA driver first."
Require-Command "node" "Install Node.js 20+ first."
Require-Command "ollama" "Install Ollama for Windows from https://ollama.com/download/windows"

$Gpu = (& nvidia-smi --query-gpu=name,memory.total,driver_version --format=csv,noheader 2>$null | Select-Object -First 1)
Write-Host "GPU: $Gpu"

try {
  Invoke-RestMethod -Uri "http://127.0.0.1:11434/api/tags" -Method Get -TimeoutSec 2 | Out-Null
} catch {
  Write-Host "Starting Ollama..."
  Start-Process -FilePath "ollama" -ArgumentList "serve" -WindowStyle Hidden
  Wait-Ollama
}

if (-not (Test-Path $EnvFile)) {
  $bytes = New-Object byte[] 48
  [Security.Cryptography.RandomNumberGenerator]::Fill($bytes)
  $key = [Convert]::ToBase64String($bytes).TrimEnd('=').Replace('+','-').Replace('/','_')
  @"
SFM_LOCAL_API_KEY=$key
SFM_LOCAL_SERVED_MODEL=sfm-local-primary
OLLAMA_MODEL=$Model
SFM_LOCAL_NUM_CTX=8192
SFM_LOCAL_MAX_OUTPUT_TOKENS=768
SFM_LOCAL_OLLAMA_TIMEOUT_MS=20000
SFM_LOCAL_KEEP_ALIVE=30m
SFM_LOCAL_GATEWAY_PORT=8787
"@ | Set-Content -Path $EnvFile -Encoding utf8
  Write-Host "Created $EnvFile with a private gateway key. Do not commit or share it."
}

Get-Content $EnvFile | ForEach-Object {
  $line = $_.Trim()
  if (-not $line -or $line.StartsWith('#')) { return }
  $parts = $line -split '=', 2
  if ($parts.Count -eq 2) {
    [Environment]::SetEnvironmentVariable($parts[0].Trim(), $parts[1].Trim(), 'Process')
  }
}

if (-not $env:OLLAMA_MODEL) { $env:OLLAMA_MODEL = $Model }
Write-Host "Ensuring model is installed: $env:OLLAMA_MODEL"
& ollama pull $env:OLLAMA_MODEL
if ($LASTEXITCODE -ne 0) { throw "ollama pull failed" }

Write-Host "Starting SFM Local AI Gateway on http://127.0.0.1:$env:SFM_LOCAL_GATEWAY_PORT/v1"
Write-Host "Keep this PowerShell window open while THE SFM is using your PC as its AI node."
& node (Join-Path $Root "gateway.mjs")
