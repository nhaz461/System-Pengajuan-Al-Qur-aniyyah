# =====================================================================
# Launcher Otomatis - Sistem Administrasi Keuangan Yayasan Al-Qur'aniyyah
# =====================================================================

$baseDir = "d:\PENGAJUAN & PENCAIRAN"
$backendDir = Join-Path $baseDir "backend"
$frontendDir = Join-Path $baseDir "frontend"

# Refresh PATH agar node selalu terbaca
$env:PATH = [System.Environment]::GetEnvironmentVariable('PATH','Machine') + ';' + [System.Environment]::GetEnvironmentVariable('PATH','User')

# Fungsi pengecekan port TCP
function Test-PortOpen ($port) {
    try {
        $tcp = New-Object System.Net.Sockets.TcpClient
        $iar = $tcp.BeginConnect("127.0.0.1", $port, $null, $null)
        $wait = $iar.AsyncWaitHandle.WaitOne(800, $false)
        if ($wait) {
            $tcp.EndConnect($iar)
            $tcp.Close()
            return $true
        } else {
            $tcp.Close()
            return $false
        }
    } catch {
        return $false
    }
}

# 1. Cek & Jalankan Backend (Port 5000)
$backendReady = Test-PortOpen 5000
if (-not $backendReady) {
    Start-Process -FilePath "node" `
        -ArgumentList "node_modules/ts-node-dev/lib/bin.js --respawn --transpile-only src/index.ts" `
        -WorkingDirectory $backendDir `
        -WindowStyle Hidden
}

# 2. Cek & Jalankan Frontend (Port 3000)
$frontendReady = Test-PortOpen 3000
if (-not $frontendReady) {
    Start-Process -FilePath "node" `
        -ArgumentList "node_modules/vite/bin/vite.js --host 0.0.0.0 --port 3000" `
        -WorkingDirectory $frontendDir `
        -WindowStyle Hidden
}

# 3. Tunggu hingga Frontend siap merespon
$retries = 0
$isUp = $false
while (-not $isUp -and $retries -lt 30) {
    Start-Sleep -Milliseconds 500
    if (Test-PortOpen 3000) {
        $isUp = $true
        break
    }
    $retries++
}

# Tambahan jeda sejenak agar server siap render
Start-Sleep -Milliseconds 500

# 4. Luncurkan browser default langsung ke URL aplikasi
Start-Process "http://localhost:3000"
