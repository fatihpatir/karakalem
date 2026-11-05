Add-Type -AssemblyName System.Drawing

function Create-AppIcon([int]$dimension, [string]$outPath) {
    $bmp = New-Object System.Drawing.Bitmap($dimension, $dimension)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
    $g.Clear([System.Drawing.Color]::Transparent)

    # Dış Daire Arka Plan
    $rect = New-Object System.Drawing.Rectangle(0, 0, $dimension, $dimension)
    $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
        $rect,
        [System.Drawing.Color]::FromArgb(255, 24, 24, 27),
        [System.Drawing.Color]::FromArgb(255, 9, 9, 11),
        [System.Drawing.Drawing2D.LinearGradientMode]::ForwardDiagonal
    )
    $g.FillEllipse($brush, 4, 4, ($dimension - 8), ($dimension - 8))

    # Altın/Kehribar Halka
    $pen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(255, 245, 158, 11), [float]($dimension * 0.035))
    $g.DrawEllipse($pen, [float]($dimension * 0.05), [float]($dimension * 0.05), [float]($dimension * 0.9), [float]($dimension * 0.9))

    # Kurşun Kalem Ucu İkonu (Merkezde)
    # Üstte kurşun kalem sembolü / Sanatçı İmzası
    $fontSize = [float]($dimension * 0.26)
    $font = New-Object System.Drawing.Font('Arial', $fontSize, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
    $goldBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 251, 191, 36))
    
    $sf = New-Object System.Drawing.StringFormat
    $sf.Alignment = [System.Drawing.StringAlignment]::Center
    $sf.LineAlignment = [System.Drawing.StringAlignment]::Center
    
    $textRect = New-Object System.Drawing.RectangleF(0, [float]($dimension * 0.22), [float]$dimension, [float]($dimension * 0.35))
    $g.DrawString('✏️', $font, $goldBrush, $textRect, $sf)

    # İkinci Metin: KARAKALEM
    $subFontSize = [float]($dimension * 0.09)
    $subFont = New-Object System.Drawing.Font('Arial', $subFontSize, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
    $whiteBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 255, 255, 255))
    $subRect = New-Object System.Drawing.RectangleF(0, [float]($dimension * 0.62), [float]$dimension, [float]($dimension * 0.16))
    $g.DrawString('KARAKALEM', $subFont, $whiteBrush, $subRect, $sf)

    # Küçük Sanatçı İmzası: FATİH PATIR
    $signFontSize = [float]($dimension * 0.055)
    $signFont = New-Object System.Drawing.Font('Arial', $signFontSize, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)
    $dimBrush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 217, 119, 6))
    $signRect = New-Object System.Drawing.RectangleF(0, [float]($dimension * 0.76), [float]$dimension, [float]($dimension * 0.12))
    $g.DrawString('FATİH PATIR', $signFont, $dimBrush, $signRect, $sf)

    $bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
    Write-Output "Oluşturuldu: $outPath"
}

Create-AppIcon 192 "icons/icon-192.png"
Create-AppIcon 512 "icons/icon-512.png"
