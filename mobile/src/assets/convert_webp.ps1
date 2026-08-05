Add-Type -AssemblyName PresentationCore, WindowsBase

$stream = [System.IO.File]::OpenRead('D:\devicedesk\public\flymedia-logo-white.png')
$decoder = [System.Windows.Media.Imaging.BitmapDecoder]::Create($stream, [System.Windows.Media.Imaging.BitmapCreateOptions]::None, [System.Windows.Media.Imaging.BitmapCacheOption]::OnLoad)
$frame = $decoder.Frames[0]

$encoder = New-Object System.Windows.Media.Imaging.PngBitmapEncoder
$encoder.Frames.Add($frame)

$outStream = [System.IO.File]::Create('D:\devicedesk\mobile\src\assets\flymedia_logo_white.png')
$encoder.Save($outStream)
$outStream.Close()
$stream.Close()

Copy-Item 'D:\devicedesk\public\logo.png' 'D:\devicedesk\mobile\src\assets\flymedia_logo.png' -Force

Write-Host "Both logos successfully converted to true PNG!"
