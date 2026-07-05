param(
  [string]$TunnelLog = "tunnel-output.log"
)

$ErrorActionPreference = "Stop"

# Read VERCEL_TOKEN from .env
$envContent = Get-Content ".env" -Raw
$match = [regex]::Match($envContent, 'VERCEL_TOKEN=(\S+)')
if (-not $match.Success) {
  Write-Error "VERCEL_TOKEN not found in .env"
  exit 1
}
$token = $match.Groups[1].Value

# Extract tunnel URL from log
$logContent = Get-Content $TunnelLog -Raw
$urlMatch = [regex]::Match($logContent, 'https://[a-z0-9-]+\.trycloudflare\.com')
if (-not $urlMatch.Success) {
  Write-Error "No tunnel URL found in $TunnelLog. Is the tunnel running?"
  exit 1
}
$tunnelUrl = $urlMatch.Value.Trim()
Write-Host "Found tunnel URL: $tunnelUrl"

# Update Vercel environment variable
$envOld = $env:VERCEL_TOKEN
$env:VERCEL_TOKEN = $token

Write-Host "Removing old ENGINE_URL..."
npx vercel env rm ENGINE_URL production --yes --token $token 2>$null

Write-Host "Setting ENGINE_URL to $tunnelUrl..."
$tunnelUrl | npx vercel env add ENGINE_URL production --token $token
if ($LASTEXITCODE -ne 0) {
  Write-Error "Failed to set ENGINE_URL"
  exit 1
}

Write-Host "Triggering redeploy..."
npx vercel deploy --prod --token $token
if ($LASTEXITCODE -eq 0) {
  Write-Host "Success: ENGINE_URL updated and redeploy triggered."
} else {
  Write-Host "ENGINE_URL updated. Manual redeploy may be needed."
}

$env:VERCEL_TOKEN = $envOld
