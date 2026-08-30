@echo off
setlocal
cd /d "%~dp0"

set "APP_URL=http://localhost:5174/"

call :is_ready
if not errorlevel 1 goto open_app

where npm.cmd >nul 2>nul
if errorlevel 1 (
  echo Node.js was not found. Install Node.js, then run this file again.
  pause
  exit /b 1
)

start "Zhishi App Server" /min npm.cmd run dev -- --port 5174 --strictPort

for /l %%i in (1,1,30) do (
  timeout /t 1 /nobreak >nul
  call :is_ready
  if not errorlevel 1 goto open_app
)

echo The app did not start at %APP_URL%
pause
exit /b 1

:open_app
start "" "%APP_URL%"
exit /b 0

:is_ready
powershell.exe -NoProfile -Command "try { $response = Invoke-WebRequest -UseBasicParsing -Uri '%APP_URL%' -TimeoutSec 2; if ($response.StatusCode -eq 200) { exit 0 } } catch {}; exit 1" >nul 2>nul
exit /b %errorlevel%
