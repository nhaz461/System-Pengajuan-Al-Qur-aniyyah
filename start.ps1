# Sistem Administrasi Keuangan Yayasan Al-Qur'aniyyah
# Script Startup v1.0

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════╗"
Write-Host "║   Sistem Keuangan - Yayasan Al-Qur'aniyyah        ║"
Write-Host "║   Starting services...                              ║"
Write-Host "╚════════════════════════════════════════════════════╝"
Write-Host ""

# Refresh PATH untuk menemukan Node.js
$env:PATH = [System.Environment]::GetEnvironmentVariable("PATH", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("PATH", "User")

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# Start Backend
Write-Host "🚀 Starting Backend (Port 5000)..."
Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "`$env:PATH = [System.Environment]::GetEnvironmentVariable('PATH','Machine') + ';' + [System.Environment]::GetEnvironmentVariable('PATH','User'); `$env:DATABASE_URL = 'file:../../database/alquraniyyah.db'; cd '$ScriptDir\backend'; node node_modules\ts-node-dev\lib\bin.js --respawn --transpile-only src/index.ts"
) -WindowStyle Normal

Start-Sleep -Seconds 4

# Start Frontend
Write-Host "🌐 Starting Frontend (Port 3000)..."
Start-Process powershell -ArgumentList @(
    "-NoExit",
    "-Command",
    "`$env:PATH = [System.Environment]::GetEnvironmentVariable('PATH','Machine') + ';' + [System.Environment]::GetEnvironmentVariable('PATH','User'); cd '$ScriptDir\frontend'; node node_modules\vite\bin\vite.js --host 0.0.0.0 --port 3000"
) -WindowStyle Normal

Start-Sleep -Seconds 5

Write-Host ""
Write-Host "✅ Aplikasi berjalan!"
Write-Host ""
Write-Host "   Backend:   http://localhost:5000"
Write-Host "   Frontend:  http://localhost:3000"
Write-Host "   LAN:       http://192.168.1.62:3000"
Write-Host ""
Write-Host "   Login Admin:"
Write-Host "   Email:     admin@alquraniyyah.sch.id"
Write-Host "   Password:  Admin@2026"
Write-Host ""
