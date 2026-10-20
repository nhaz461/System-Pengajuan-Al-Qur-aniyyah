@echo off
title Pasang AutoRun - Sistem Keuangan Al-Qur'aniyyah
cd /d "%~dp0"

echo ========================================================
echo   PASANG AUTORUN SISTEM KEUANGAN YAYASAN AL-QUR'ANIYYAH
echo ========================================================
echo.
echo Mendaftarkan aplikasi ke Windows Startup agar berjalan otomatis saat PC dinyalakan...
echo.

powershell -ExecutionPolicy Bypass -File "%~dp0setup-autorun.ps1"

echo.
echo [SUKSES] Sistem Keuangan akan otomatis berjalan setiap kali PC ini dinyalakan.
echo.
pause
