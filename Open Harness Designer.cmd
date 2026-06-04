@echo off
set "APP_DIR=%~dp0"
set "APP_URL=file:///%APP_DIR:\=/%index.html"

if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" (
  start "" "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" --app="%APP_URL%" --window-size=1400,900
  exit /b
)

where msedge >nul 2>nul
if not errorlevel 1 (
  start "" msedge --app="%APP_URL%" --window-size=1400,900
  exit /b
)

start "" "%APP_DIR%index.html"
