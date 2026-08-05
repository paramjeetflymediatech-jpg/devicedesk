Add-Type -AssemblyName System.Drawing

$b1 = New-Object System.Drawing.Bitmap('D:\devicedesk\mobile\src\assets\flymedia_logo_white.png')
$b1.Save('D:\devicedesk\mobile\src\assets\flymedia_logo_white_clean.png', [System.Drawing.Imaging.ImageFormat]::Png)
$b1.Dispose()
Remove-Item 'D:\devicedesk\mobile\src\assets\flymedia_logo_white.png'
Move-Item 'D:\devicedesk\mobile\src\assets\flymedia_logo_white_clean.png' 'D:\devicedesk\mobile\src\assets\flymedia_logo_white.png'

$b2 = New-Object System.Drawing.Bitmap('D:\devicedesk\mobile\src\assets\flymedia_logo.png')
$b2.Save('D:\devicedesk\mobile\src\assets\flymedia_logo_clean.png', [System.Drawing.Imaging.ImageFormat]::Png)
$b2.Dispose()
Remove-Item 'D:\devicedesk\mobile\src\assets\flymedia_logo.png'
Move-Item 'D:\devicedesk\mobile\src\assets\flymedia_logo_clean.png' 'D:\devicedesk\mobile\src\assets\flymedia_logo.png'
