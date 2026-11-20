@echo off
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Start-TestFlight.ps1"
if errorlevel 1 echo Build or upload stopped. Read the error above; no TestFlight success is assumed.
pause
