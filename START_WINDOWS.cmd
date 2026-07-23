@echo off
cd /d "%~dp0"
echo Installing dependencies...
call npm.cmd install
if errorlevel 1 (
  echo.
  echo npm install failed. Check Node.js installation and internet connection.
  pause
  exit /b 1
)
echo.
echo Starting Chaos Cards...
call npm.cmd run dev
pause
