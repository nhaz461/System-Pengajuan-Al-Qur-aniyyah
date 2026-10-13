@echo off
echo.
echo Menghentikan server Sistem Keuangan (Port 3000 & 5000)...
powershell -Command "Get-NetTCPConnection -LocalPort 3000, 5000 -ErrorAction SilentlyContinue | ForEach-Object { Stop-Process -Id $_.OwningProcess -Force -ErrorAction SilentlyContinue }; Write-Host '? Server berhasil dihentikan.' -ForegroundColor Green"
timeout /t 2 /nobreak >nul
