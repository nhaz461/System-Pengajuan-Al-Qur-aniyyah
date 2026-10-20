$wsh = New-Object -ComObject WScript.Shell
$scriptDir = $PSScriptRoot
if (-not $scriptDir) { $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path }
if (-not $scriptDir) { $scriptDir = (Get-Location).Path }

$startup = [Environment]::GetFolderPath('Startup')
$shortcutPath = Join-Path $startup "Sistem Keuangan Yayasan AutoRun.lnk"
$s = $wsh.CreateShortcut($shortcutPath)
$s.TargetPath = "wscript.exe"
$vbsPath = Join-Path $scriptDir "AutoRun-Sistem-Keuangan.vbs"
$s.Arguments = "`"$vbsPath`""
$s.WorkingDirectory = $scriptDir
$icoPath = Join-Path $scriptDir "app_icon.ico"
if (Test-Path $icoPath) {
    $s.IconLocation = "$icoPath,0"
}
$s.Description = "AutoRun Sistem Keuangan Yayasan Al-Qur'aniyyah saat Windows Dinyalakan"
$s.Save()

Write-Host "AutoRun berhasil dipasang di Windows Startup: $shortcutPath" -ForegroundColor Green
