@echo off
cd /d "%~dp0"

:: Read .env for VERCEL_TOKEN
for /f "tokens=2 delims==" %%a in ('findstr "^VERCEL_TOKEN=" ".env" 2^>nul') do set VERCEL_TOKEN=%%a
if "%VERCEL_TOKEN%"=="" (
  echo ERROR: VERCEL_TOKEN not found in .env
  exit /b 1
)

:: Extract tunnel URL from tunnel-output.log
for /f "tokens=*" %%a in ('findstr "trycloudflare" tunnel-output.log 2^>nul') do (
  set LINE=%%a
)
if "%LINE%"=="" (
  echo ERROR: No tunnel URL found in tunnel-output.log. Is the tunnel running?
  exit /b 1
)

:: Parse the URL from the log line (remove leading/trailing noise)
for /f "tokens=3" %%b in ('echo %LINE%') do set TUNNEL_URL=%%b

echo Found tunnel URL: %TUNNEL_URL%

:: Update Vercel environment variable
npx vercel env rm ENGINE_URL production --yes --token "%VERCEL_TOKEN%" 2>nul
echo %TUNNEL_URL% | npx vercel env add ENGINE_URL production --token "%VERCEL_TOKEN%"

if %ERRORLEVEL% equ 0 (
  echo Success: ENGINE_URL set to %TUNNEL_URL%
  :: Trigger redeploy
  npx vercel deploy --prod --token "%VERCEL_TOKEN%" >nul 2>&1
  if %ERRORLEVEL% equ 0 (
    echo Redeploy triggered. Vercel will pick up the new ENGINE_URL.
  ) else (
    echo Note: Redeploy may need manual trigger via Vercel dashboard.
  )
) else (
  echo ERROR: Failed to update ENGINE_URL
  exit /b 1
)
