Add-Type -AssemblyName System.Drawing

$assetsDir = "d:\devicedesk\desktop-agent\assets"
if (!(Test-Path $assetsDir)) {
    New-Item -ItemType Directory -Path $assetsDir -Force
}

$bmp = New-Object System.Drawing.Bitmap 64, 64
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias

# Background rounded box
$brushBg = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(255, 37, 99, 235))
$g.FillEllipse($brushBg, 2, 2, 60, 60)

# Inner computer icon screen
$brushScreen = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::White)
$g.FillRectangle($brushScreen, 16, 18, 32, 22)

$brushBase = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::White)
$g.FillRectangle($brushBase, 26, 40, 12, 4)
$g.FillRectangle($brushBase, 20, 44, 24, 3)

# Save PNG
$pngPath = Join-Path $assetsDir "icon.png"
$bmp.Save($pngPath, [System.Drawing.Imaging.ImageFormat]::Png)

$g.Dispose()
$bmp.Dispose()
Write-Host "Created Desktop Agent Icon at $pngPath"
