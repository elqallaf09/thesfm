param([switch]$Preview)
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot

function Invoke-Checked {
  param([string]$Program, [string[]]$Arguments)
  & $Program @Arguments
  if ($LASTEXITCODE -ne 0) { throw "$Program failed (exit $LASTEXITCODE). Build/upload has not completed." }
}

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  throw 'Install Node.js 22.13 or newer LTS, then run this file again.'
}
$nodeMajor = [int]((& node -p 'process.versions.node.split(".")[0]') | Select-Object -Last 1)
if ($nodeMajor -lt 22) { throw 'Node.js 22 or newer is required.' }

Write-Host 'SFM TV iPhone beta - installing and validating the application.'
Invoke-Checked npx.cmd @('--yes', 'pnpm@11.1.3', 'install', '--frozen-lockfile')
Invoke-Checked npx.cmd @('--yes', 'pnpm@11.1.3', 'typecheck')
Invoke-Checked npx.cmd @('--yes', 'pnpm@11.1.3', 'test')
if ($Preview) {
  Invoke-Checked npx.cmd @('--yes', 'pnpm@11.1.3', 'start', '--tunnel')
  exit 0
}
Invoke-Checked npx.cmd @('--yes', 'pnpm@11.1.3', 'export:ios')

Write-Host 'Use your Expo account and, when requested, your Apple Developer login/2FA in this window.'
Write-Host 'This creates an iPhone project; do not select the separate Apple TV or Finance project.'
Invoke-Checked npx.cmd @('--yes', 'eas-cli@27.9.0', 'login')
$config = Get-Content -LiteralPath 'app.json' -Raw | ConvertFrom-Json
if (-not $config.expo.extra.eas.projectId) {
  Invoke-Checked npx.cmd @('--yes', 'eas-cli@27.9.0', 'init')
}
# Submit to App Store Connect/TestFlight only. This does not submit to App Store review.
Invoke-Checked npx.cmd @('--yes', 'eas-cli@27.9.0', 'build', '--platform', 'ios', '--profile', 'testflight', '--auto-submit')
Write-Host 'Check the EAS submission link and App Store Connect processing status before testing.'
Write-Host 'For a new app, enable its build for your internal TestFlight group after Apple processing.'
