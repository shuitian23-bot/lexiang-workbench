@echo off
setlocal
cd /d "%~dp0"

where py >nul 2>nul
if %errorlevel%==0 (
  py -3 local-preview-server.py
  goto end
)

where python >nul 2>nul
if %errorlevel%==0 (
  python local-preview-server.py
  goto end
)

echo Python 3 is required to start the local preview.
echo Please install Python 3, then double click this file again.

:end
pause
