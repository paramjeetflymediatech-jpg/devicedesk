$downloadDir = "d:\devicedesk\public\download"
if (!(Test-Path $downloadDir)) {
    New-Item -ItemType Directory -Path $downloadDir -Force
}

Write-Host "Installing Desktop Agent dependencies..."
Set-Location "d:\devicedesk\desktop-agent"
npm install --no-audit

Write-Host "Building DeviceDeskAgent.exe production installer..."
npx electron-builder --win nsis --config.win.target=nsis

$distExe = "d:\devicedesk\desktop-agent\dist\DeviceDeskAgent Setup 1.0.0.exe"
if (Test-Path $distExe) {
    Copy-Item $distExe "$downloadDir\DeviceDeskAgent-Setup.exe" -Force
    Write-Host "SUCCESS: Packaged installer saved to $downloadDir\DeviceDeskAgent-Setup.exe"
} else {
    Write-Host "Notice: Installer build output checked."
}
