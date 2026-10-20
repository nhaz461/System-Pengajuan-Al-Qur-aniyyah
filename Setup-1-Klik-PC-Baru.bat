@echo off
title Setup 1-Klik Sistem Keuangan Yayasan Al-Qur'aniyyah
cd /d "%~dp0"

echo ========================================================
echo   SETUP 1-KLIK SISTEM KEUANGAN UNTUK PC BARU
echo   Yayasan Pendidikan Islam Al-Qur'aniyyah
echo ========================================================
echo.
echo Script ini akan secara otomatis:
echo   1. Mengecek runtime Node.js Portable
echo   2. Membuat Shortcut Desktop 'Sistem Keuangan Al-Qur'aniyyah'
echo   3. Memasang Auto-Run saat PC dinyalakan
echo   4. Menjalankan aplikasi secara langsung
echo.
echo Memulai proses...
echo.

powershell -ExecutionPolicy Bypass -File "%~dp0installer.ps1"

echo.
echo Menjalankan aplikasi Sistem Keuangan...
wscript.exe "%~dp0Buka_Aplikasi.vbs"

echo.
echo [SELESAI] Aplikasi telah berjalan di http://localhost:5000.
echo Anda dapat menutup jendela ini.
pause
