$ErrorActionPreference = "Continue"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "   SETUP OTOMATIS 1-KLIK SISTEM KEUANGAN AL-QUR'ANIYYAH  " -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""

$scriptDir = $PSScriptRoot
if (-not $scriptDir) { $scriptDir = (Get-Location).Path }

# 1. Cek Node.js (Portable atau Sistem)
Write-Host "[1/3] Memeriksa Portable Node.js runtime..." -ForegroundColor Cyan
$portableNode = Join-Path $scriptDir "bin\node.exe"
$nodeAvailable = $false

if (Test-Path $portableNode) {
    try {
        $ver = & "$portableNode" -v 2>$null
        Write-Host "       Node.js Portable siap digunakan: $ver" -ForegroundColor Green
        $nodeAvailable = $true
    } catch {}
}

if (-not $nodeAvailable) {
    try {
        $ver = & node -v 2>$null
        if ($ver) {
            Write-Host "       Node.js Sistem terdeteksi: $ver" -ForegroundColor Green
            $nodeAvailable = $true
        }
    } catch {}
}

if (-not $nodeAvailable) {
    $stdPaths = @("C:\Program Files\nodejs\node.exe", "C:\Program Files (x86)\nodejs\node.exe")
    foreach ($p in $stdPaths) {
        if (Test-Path $p) {
            $nodeAvailable = $true
            $env:Path += ";$(Split-Path $p)"
            Write-Host "       Node.js ditemukan di $p" -ForegroundColor Green
            break
        }
    }
}

if (-not $nodeAvailable) {
    Write-Host "       Node.js belum terpasang. Mengunduh installer resmi..." -ForegroundColor Yellow
    $msiUrl = "https://nodejs.org/dist/v20.18.0/node-v20.18.0-x64.msi"
    $msiPath = Join-Path $env:TEMP "nodejs-installer.msi"
    try {
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        Invoke-WebRequest -Uri $msiUrl -OutFile $msiPath
        Write-Host "       Memasang Node.js ke sistem (mohon tunggu sejenak)..." -ForegroundColor Yellow
        Start-Process msiexec.exe -ArgumentList "/i `"$msiPath`" /passive /norestart" -Wait
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
        Write-Host "       Node.js berhasil dipasang!" -ForegroundColor Green
    } catch {
        Write-Host "       Peringatan: Gagal unduh otomatis, namun Anda bisa pasang manual dari nodejs.org." -ForegroundColor Yellow
    }
}

# 2. Buat Shortcut Desktop
Write-Host ""
Write-Host "[2/3] Membuat Shortcut Desktop..." -ForegroundColor Cyan
try {
    $wsh = New-Object -ComObject WScript.Shell
    $desktop = [Environment]::GetFolderPath('Desktop')
    $deskShortcut = $wsh.CreateShortcut((Join-Path $desktop "Sistem Keuangan Al-Qur'aniyyah.lnk"))
    $deskShortcut.TargetPath = "wscript.exe"
    $deskShortcut.Arguments = "`"" + (Join-Path $scriptDir "Buka_Aplikasi.vbs") + "`""
    $deskShortcut.WorkingDirectory = $scriptDir
    $ico = Join-Path $scriptDir "app_icon.ico"
    if (Test-Path $ico) { 
        $deskShortcut.IconLocation = "$ico,0" 
    }
    $deskShortcut.Description = "Sistem Administrasi Keuangan Yayasan Al-Qur'aniyyah"
    $deskShortcut.Save()
    Write-Host "       Shortcut 'Sistem Keuangan Al-Qur'aniyyah' berhasil dibuat di Desktop!" -ForegroundColor Green
} catch {
    Write-Host "       Peringatan: Gagal membuat shortcut desktop." -ForegroundColor Yellow
}

# 3. Pasang AutoRun Startup
Write-Host ""
Write-Host "[3/3] Mendaftarkan AutoRun Windows Startup..." -ForegroundColor Cyan
try {
    $startup = [Environment]::GetFolderPath('Startup')
    $startShortcut = $wsh.CreateShortcut((Join-Path $startup "Sistem Keuangan Yayasan AutoRun.lnk"))
    $startShortcut.TargetPath = "wscript.exe"
    $vbsPath = Join-Path $scriptDir "AutoRun-Sistem-Keuangan.vbs"
    $startShortcut.Arguments = "`"$vbsPath`""
    $startShortcut.WorkingDirectory = $scriptDir
    if (Test-Path $ico) { 
        $startShortcut.IconLocation = "$ico,0" 
    }
    $startShortcut.Description = "AutoRun Sistem Keuangan Yayasan Al-Qur'aniyyah saat Windows Dinyalakan"
    $startShortcut.Save()
    Write-Host "       AutoRun berhasil dipasang di Windows Startup!" -ForegroundColor Green
} catch {
    Write-Host "       Peringatan: Gagal mendaftarkan AutoRun." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "   SETUP BERHASIL! APLIKASI SIAP DIGUNAKAN DI PC INI.    " -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
