$wsh = New-Object -ComObject WScript.Shell
$scriptDir = $PSScriptRoot
if (-not $scriptDir) { $scriptDir = (Get-Location).Path }

$desktop = [Environment]::GetFolderPath('Desktop')
$shortcutPath = Join-Path $desktop "Sistem Keuangan Al-Qur'aniyyah.lnk"
$s = $wsh.CreateShortcut($shortcutPath)
$s.TargetPath = "wscript.exe"
$vbsPath = Join-Path $scriptDir "Buka_Aplikasi.vbs"
$s.Arguments = "`"$vbsPath`""
$s.WorkingDirectory = $scriptDir
$icoPath = Join-Path $scriptDir "app_icon.ico"
if (Test-Path $icoPath) {
    $s.IconLocation = "$icoPath,0"
}
$s.Description = "Sistem Administrasi Keuangan Yayasan Al-Qur'aniyyah"
$s.Save()

Write-Host "Shortcut Desktop berhasil dibuat di: $shortcutPath" -ForegroundColor Green
