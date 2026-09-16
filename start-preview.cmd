@echo off
cd /d "%~dp0"
if not exist dist\cli.js (
  echo Build required. Run npm ci and npm run build first.
  pause
  exit /b 1
)
node dist/cli.js preview docs --port 0 --open
pause
