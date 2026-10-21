@echo off
title Push Project ke GitHub nhaz461
cd /d "D:\PENGAJUAN & PENCAIRAN"

echo.
echo ========================================================
echo   UPLOAD / PUSH KODE SISTEM KEUANGAN KE GITHUB
echo   Target: https://github.com/nhaz461/System-Pengajuan-Al-Qur-aniyyah.git
echo ========================================================
echo.
echo Menjalankan git push ke branch main...
echo Jika muncul jendela browser login GitHub, silakan klik 'Authorize/Sign In'.
echo.

git push -u origin main

echo.
echo ========================================================
if %ERRORLEVEL% equ 0 (
    echo [SUKSES] Seluruh kode program berhasil di-push ke GitHub!
    echo Anda sekarang bisa langsung menghubungkan repo ini ke Vercel.
) else (
    echo [INFO] Jika ada penolakan, mencoba push dengan opsi upstream:
    git push -u origin main --force
)
echo ========================================================
echo.
pause
