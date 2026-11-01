@echo off
rem GRS server-sync demo: starts the HTTPS server and opens https://localhost:8443/ .
rem Close this window to stop the server. Extra arguments go to the server, e.g. -Port 9443
rem Started from PowerShell 7, the inherited PSModulePath hides Windows PowerShell's own modules (no Cert: drive).
set "PSModulePath="
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0server\grs-demo-server.ps1" %*
if errorlevel 1 pause
