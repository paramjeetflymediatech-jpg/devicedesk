$downloadDir = "d:\devicedesk\public\download"
if (!(Test-Path $downloadDir)) {
    New-Item -ItemType Directory -Path $downloadDir -Force
}

Write-Host "Closing any active agent processes..."
Get-Process -Name "DeviceDeskAgent", "electron" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

Start-Sleep -Seconds 1

$distDir = "d:\devicedesk\desktop-agent\dist"
if (Test-Path $distDir) {
    Remove-Item -Path $distDir -Recurse -Force -ErrorAction SilentlyContinue
}

Write-Host "Installing Desktop Agent dependencies..."
Set-Location "d:\devicedesk\desktop-agent"
npm install --no-audit

Write-Host "Building DeviceDesk Agent cross-platform installers..."
npx electron-builder --win nsis zip

# Copy all created installers to public/download
$targets = Get-ChildItem -Path $distDir -Include "*.exe", "*.AppImage", "*.deb", "*.dmg", "*.zip" -Recurse -ErrorAction SilentlyContinue
foreach ($file in $targets) {
    Copy-Item $file.FullName "$downloadDir\" -Force
    Write-Host "Published artifact: $($file.Name) -> $downloadDir"
}

Write-Host "=========================================================="
Write-Host "SUCCESS: DeviceDesk Agent installers published cleanly!"
Write-Host "Saved to: $downloadDir"
Write-Host "=========================================================="
