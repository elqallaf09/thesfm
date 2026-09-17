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
if ($model -notmatch '^[A-Za-z0-9._:-]{1,64}$') { throw "Local served model name is invalid." }
if ($port -notmatch '^\d{2,5}$') { throw "Local gateway port is invalid." }

$headers = @{ Authorization = "Bearer $key" }
$modelsUri = "http://127.0.0.1:$port/v1/models"
$chatUri = "http://127.0.0.1:$port/v1/chat/completions"

function Invoke-SfmLocal([string]$Uri, [string]$Method, [string]$Body = $null) {
  try {
    if ($null -eq $Body) {
      return Invoke-RestMethod -Uri $Uri -Headers $headers -Method $Method -TimeoutSec 30
    }
    return Invoke-RestMethod -Uri $Uri -Headers $headers -ContentType 'application/json; charset=utf-8' -Method $Method -Body $Body -TimeoutSec 60
  } catch {
    $status = $null
    if ($_.Exception.Response -and $_.Exception.Response.StatusCode) {
      try { $status = [int]$_.Exception.Response.StatusCode } catch { $status = $null }
    }
    if ($status -eq 401) {
      throw "SFM Local AI returned UNAUTHORIZED. Keep start.ps1 running and make sure test.ps1 is reading the same services/sfm-local-ai/.env.local file. Do not test the protected endpoint in a browser because the browser does not send the bearer key."
    }
    throw
  }
}

Write-Host "Checking authenticated model endpoint..."
$modelResult = Invoke-SfmLocal -Uri $modelsUri -Method 'Get'
$modelResult | ConvertTo-Json -Depth 6

Write-Host "Testing Arabic generation through the authenticated SFM gateway..."
# Keep this script ASCII-only for Windows PowerShell 5.1. JSON itself decodes
# these Unicode escapes before the prompt reaches Ollama.
$body = '{"model":"' + $model + '","stream":false,"max_tokens":64,"messages":[{"role":"system","content":"\u0623\u062c\u0628 \u0628\u0627\u0644\u0639\u0631\u0628\u064a\u0629 \u0628\u0627\u062e\u062a\u0635\u0627\u0631 \u0634\u062f\u064a\u062f."},{"role":"user","content":"\u0642\u0644: SFM \u062c\u0627\u0647\u0632 \u0644\u0644\u0639\u0645\u0644 \u0645\u062d\u0644\u064a\u0627\u064b."}]}'
$chatResult = Invoke-SfmLocal -Uri $chatUri -Method 'Post' -Body $body
$chatResult | ConvertTo-Json -Depth 8

if (-not $chatResult.choices -or -not $chatResult.choices[0].message.content) {
  throw "SFM Local AI returned no assistant content."
}

Write-Host "SFM Local AI authenticated smoke test passed."
