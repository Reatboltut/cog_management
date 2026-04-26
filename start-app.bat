@echo off
setlocal

cd /d "%~dp0"

set "APP_PORT=3000"

if exist ".env" (
  for /f "usebackq eol=# tokens=1,* delims==" %%A in (".env") do (
    call :read_env "%%~A" "%%~B"
  )
)

if not defined APP_PORT set "APP_PORT=3000"
set "APP_URL=http://127.0.0.1:%APP_PORT%"

if /I "%~1"=="--dry-run" (
  echo %APP_URL%
  exit /b 0
)

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed or is not available on PATH.
  echo Install Node.js, then run this file again.
  pause
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo npm is not installed or is not available on PATH.
  echo Install Node.js, then run this file again.
  pause
  exit /b 1
)

if /I "%~1"=="--server-only" goto run_server

echo Starting the COG app server...
start "COG App Server" cmd /k "cd /d ""%~dp0"" && npm start"

if /I "%~1"=="--no-browser" exit /b 0

echo Waiting for the app to start...
powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$url='%APP_URL%/api/health';" ^
  "$appUrl='%APP_URL%';" ^
  "$opened=$false;" ^
  "for($i=0;$i -lt 30;$i++) { try { Invoke-WebRequest -UseBasicParsing $url | Out-Null; Start-Process $appUrl; $opened=$true; break } catch { Start-Sleep -Seconds 1 } }" ^
  "if(-not $opened) { Write-Host ('Open ' + $appUrl + ' in your browser after the server finishes starting.') }"

exit /b 0

:run_server
npm start
exit /b %errorlevel%

:read_env
set "ENV_KEY=%~1"
set "ENV_VALUE=%~2"
for /f "tokens=* delims= " %%K in ("%ENV_KEY%") do set "ENV_KEY=%%K"
for /f "tokens=* delims= " %%V in ("%ENV_VALUE%") do set "ENV_VALUE=%%V"
if /I "%ENV_KEY%"=="PORT" set "APP_PORT=%ENV_VALUE%"
exit /b 0
