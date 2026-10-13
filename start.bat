@echo off
echo.
echo ╔════════════════════════════════════════════════════╗
echo ║   Sistem Keuangan - Yayasan Al-Qur'aniyyah        ║
echo ╚════════════════════════════════════════════════════╝
echo.
echo Menjalankan aplikasi...

:: Refresh PATH
setlocal EnableDelayedExpansion

echo 🚀 Starting Backend (Port 5000)...
start "Backend - Port 5000" powershell -NoExit -Command "$dir = '%~dp0backend'; Set-Location -LiteralPath $dir; $env:PATH = [System.Environment]::GetEnvironmentVariable('PATH','Machine') + ';' + [System.Environment]::GetEnvironmentVariable('PATH','User'); node node_modules/ts-node-dev/lib/bin.js --respawn --transpile-only src/index.ts"

timeout /t 3 /nobreak >nul

echo 🌐 Starting Frontend (Port 3000)...
start "Frontend - Port 3000" powershell -NoExit -Command "$dir = '%~dp0frontend'; Set-Location -LiteralPath $dir; $env:PATH = [System.Environment]::GetEnvironmentVariable('PATH','Machine') + ';' + [System.Environment]::GetEnvironmentVariable('PATH','User'); node node_modules/vite/bin/vite.js --host 0.0.0.0 --port 3000"

timeout /t 4 /nobreak >nul

echo.
echo ✅ Aplikasi berjalan!
echo.
echo    Frontend:  http://localhost:3000
echo    Backend:   http://localhost:5000
echo.
echo    Akun Login Resmi:
echo    • Ketua Umum: pimpinan@alquraniyyah.sch.id  (Pimpinan@2026)
echo    • Bendahara:  keuangan@alquraniyyah.sch.id  (Keuangan@2026)
echo    • Admin:      admin@alquraniyyah.sch.id     (Admin@2026)
echo    • Unit TU:    smpit@alquraniyyah.sch.id     (Unit@2026)
echo.
pause
