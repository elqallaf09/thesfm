$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$EnvFile = Join-Path $Root ".env.local"
if (-not (Test-Path $EnvFile)) { throw "Run start.ps1 once first." }

$settings = @{}
Get-Content $EnvFile | ForEach-Object {
  $line = $_.Trim()
  if (-not $line -or $line.StartsWith('#')) { return }
  $parts = $line -split '=', 2
  if ($parts.Count -eq 2) { $settings[$parts[0].Trim()] = $parts[1].Trim() }
}

$key = $settings['SFM_LOCAL_API_KEY']
$model = $settings['SFM_LOCAL_SERVED_MODEL']
$port = $settings['SFM_LOCAL_GATEWAY_PORT']
if (-not $key -or -not $model -or -not $port) { throw "Local AI settings are incomplete." }
$headers = @{ Authorization = "Bearer $key" }

Write-Host "Checking model endpoint..."
Invoke-RestMethod -Uri "http://127.0.0.1:$port/v1/models" -Headers $headers -Method Get | ConvertTo-Json -Depth 5

Write-Host "Testing Arabic generation..."
$body = @{
  model = $model
  stream = $false
  max_tokens = 64
  messages = @(
    @{ role = 'system'; content = 'أجب بالعربية باختصار شديد.' },
    @{ role = 'user'; content = 'قل: SFM جاهز للعمل محلياً.' }
  )
} | ConvertTo-Json -Depth 8

Invoke-RestMethod -Uri "http://127.0.0.1:$port/v1/chat/completions" -Headers $headers -ContentType 'application/json' -Method Post -Body $body | ConvertTo-Json -Depth 8
