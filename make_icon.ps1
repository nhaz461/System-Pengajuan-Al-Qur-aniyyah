Add-Type -AssemblyName System.Drawing

$srcPath = "C:\Users\Nasrullah\.gemini\antigravity\brain\981f3773-992a-41bc-bc06-5cccd9894c9b\app_icon_1790924513550.jpg"
$destIco = "d:\PENGAJUAN & PENCAIRAN\app_icon.ico"
$destPng = "d:\PENGAJUAN & PENCAIRAN\app_icon.png"

$origBmp = [System.Drawing.Image]::FromFile($srcPath)

# Copy PNG for web / app use
$origBmp.Save($destPng, [System.Drawing.Imaging.ImageFormat]::Png)

# Sizes for high-quality Windows multi-res ICO
$sizes = @(256, 128, 64, 48, 32, 16)
$pngDataList = @()

foreach ($sz in $sizes) {
    $bmp = New-Object System.Drawing.Bitmap $sz, $sz
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.DrawImage($origBmp, 0, 0, $sz, $sz)
    $g.Dispose()

    $ms = New-Object System.IO.MemoryStream
    $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    
    $pngBytes = $ms.ToArray()
    $ms.Dispose()
    
    $pngDataList += ,@($sz, $pngBytes)
}

$origBmp.Dispose()

# Build ICO binary
$fs = [System.IO.File]::Create($destIco)
$bw = New-Object System.IO.BinaryWriter $fs

# Header: 0 (reserved), 1 (ICO type), count of images
$bw.Write([UInt16]0)
$bw.Write([UInt16]1)
$bw.Write([UInt16]$pngDataList.Count)

$offset = 6 + (16 * $pngDataList.Count)

foreach ($item in $pngDataList) {
    $sz = $item[0]
    $data = $item[1]
    
    $wByte = if ($sz -ge 256) { [byte]0 } else { [byte]$sz }
    $hByte = if ($sz -ge 256) { [byte]0 } else { [byte]$sz }
    
    $bw.Write($wByte)          # Width
    $bw.Write($hByte)          # Height
    $bw.Write([byte]0)         # Color count
    $bw.Write([byte]0)         # Reserved
    $bw.Write([UInt16]1)       # Color planes
    $bw.Write([UInt16]32)      # Bit count
    $bw.Write([UInt32]$data.Length) # Size in bytes
    $bw.Write([UInt32]$offset) # Offset
    
    $offset += $data.Length
}

# Write PNG byte arrays
foreach ($item in $pngDataList) {
    $data = $item[1]
    $bw.Write($data)
}

$bw.Close()
$fs.Close()

Write-Output "✅ Sukses membuat icon multi-resolusi di: $destIco"
