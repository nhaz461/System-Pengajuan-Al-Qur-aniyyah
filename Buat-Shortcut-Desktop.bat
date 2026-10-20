@echo off
title Buat Shortcut Desktop - Sistem Keuangan Al-Qur'aniyyah
cd /d "%~dp0"

echo ========================================================
echo   MEMBUAT SHORTCUT DESKTOP SISTEM KEUANGAN
echo ========================================================
echo.

powershell -ExecutionPolicy Bypass -File "%~dp0setup-desktop-shortcut.ps1"

echo.
echo [SUKSES] Shortcut 'Sistem Keuangan Al-Qur'aniyyah' berhasil dibuat di Desktop Anda!
echo.
pause
