@echo off
title Hapus AutoRun - Sistem Keuangan Al-Qur'aniyyah
cd /d "%~dp0"

echo ========================================================
echo   HAPUS AUTORUN SISTEM KEUANGAN DARI WINDOWS STARTUP
echo ========================================================
echo.

powershell -Command "$startup = [Environment]::GetFolderPath('Startup'); $target = Join-Path $startup 'Sistem Keuangan Yayasan AutoRun.lnk'; if (Test-Path $target) { Remove-Item $target -Force; Write-Host 'AutoRun berhasil dihapus dari Startup Windows.' -ForegroundColor Green } else { Write-Host 'AutoRun tidak ditemukan di Startup Windows.' -ForegroundColor Yellow }"

echo.
echo Selesai.
pause
