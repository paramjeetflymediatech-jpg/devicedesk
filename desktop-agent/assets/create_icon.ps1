Add-Type -AssemblyName System.Drawing

$assetsDir = "d:\devicedesk\desktop-agent\assets"
if (!(Test-Path $assetsDir)) {
    New-Item -ItemType Directory -Path $assetsDir -Force
}

$bmp = New-Object System.Drawing.Bitmap 256, 256
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias

# Background rounded box
$brushBg = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 37, 99, 235))
$g.FillEllipse($brushBg, 8, 8, 240, 240)

# Inner computer icon screen
$brushScreen = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::White)
$g.FillRectangle($brushScreen, 64, 72, 128, 88)

$brushBase = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::White)
$g.FillRectangle($brushBase, 104, 160, 48, 16)
$g.FillRectangle($brushBase, 80, 176, 96, 12)

# Save PNG
$pngPath = Join-Path $assetsDir "icon.png"
$bmp.Save($pngPath, [System.Drawing.Imaging.ImageFormat]::Png)

$g.Dispose()
$bmp.Dispose()
Write-Host "Created 256x256 Desktop Agent Icon at $pngPath"
