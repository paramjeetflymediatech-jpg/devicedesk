$downloadDir = "d:\devicedesk\public\download"
if (!(Test-Path $downloadDir)) {
    New-Item -ItemType Directory -Path $downloadDir -Force
}

Write-Host "Closing any active agent processes to unlock build files..."
Get-Process -Name "DeviceDeskAgent", "electron" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

Start-Sleep -Seconds 1

$distDir = "d:\devicedesk\desktop-agent\dist"
if (Test-Path $distDir) {
    Remove-Item -Path $distDir -Recurse -Force -ErrorAction SilentlyContinue
}

Write-Host "Installing Desktop Agent dependencies..."
Set-Location "d:\devicedesk\desktop-agent"
npm install --no-audit

Write-Host "Building DeviceDeskAgent.exe production installer..."
npx electron-builder --win nsis

$createdExe = "d:\devicedesk\desktop-agent\dist\DeviceDeskAgent-Setup.exe"
if (Test-Path $createdExe) {
    Copy-Item $createdExe "$downloadDir\DeviceDeskAgent-Setup.exe" -Force
    Write-Host "=========================================================="
    Write-Host "SUCCESS: DeviceDeskAgent-Setup.exe generated cleanly!"
    Write-Host "Saved to: $downloadDir\DeviceDeskAgent-Setup.exe"
    Write-Host "=========================================================="
} else {
    Write-Host "Build finished. Checking output files in $distDir..."
}
