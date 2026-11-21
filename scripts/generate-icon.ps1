Add-Type -AssemblyName System.Drawing

$size = 512
$bmp = New-Object System.Drawing.Bitmap $size, $size
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

# Helper to create rounded rectangle path
function Get-RoundedRectPath($x, $y, $w, $h, $r) {
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $d = $r * 2
    $path.AddArc($x, $y, $d, $d, 180, 90)
    $path.AddArc($x + $w - $d, $y, $d, $d, 270, 90)
    $path.AddArc($x + $w - $d, $y + $h - $d, $d, $d, 0, 90)
    $path.AddArc($x, $y + $h - $d, $d, $d, 90, 90)
    $path.CloseFigure()
    return $path
}

# 1. Clear background (transparent)
$g.Clear([System.Drawing.Color]::Transparent)

# 2. Outer ambient glow
for ($i = 6; $i -ge 1; $i--) {
    $glowPad = 20 - ($i * 2)
    $glowRect = Get-RoundedRectPath (20 - $i*3) (20 - $i*3) ($size - 40 + $i*6) ($size - 40 + $i*6) (120 + $i*2)
    $alpha = [int](18 / $i)
    $glowBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb($alpha, 99, 102, 241))
    $g.FillPath($glowBrush, $glowRect)
    $glowBrush.Dispose()
    $glowRect.Dispose()
}

# 3. Main Card Background
$cardPath = Get-RoundedRectPath 28 28 456 456 108
$bgBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    (New-Object System.Drawing.Point 28, 28),
    (New-Object System.Drawing.Point 484, 484),
    [System.Drawing.Color]::FromArgb(255, 11, 15, 29),
    [System.Drawing.Color]::FromArgb(255, 30, 27, 75)
)
$g.FillPath($bgBrush, $cardPath)

# 4. Neon Gradient Border
$borderPen = New-Object System.Drawing.Pen(
    (New-Object System.Drawing.Drawing2D.LinearGradientBrush(
        (New-Object System.Drawing.Point 28, 28),
        (New-Object System.Drawing.Point 484, 484),
        [System.Drawing.Color]::FromArgb(240, 0, 242, 254), # Cyan
        [System.Drawing.Color]::FromArgb(240, 168, 85, 247) # Purple
    )),
    6.0
)
$g.DrawPath($borderPen, $cardPath)
$borderPen.Dispose()

# 5. Inner subtle cyber glow
$innerGlow = New-Object System.Drawing.Drawing2D.PathGradientBrush ($cardPath)
$innerGlow.CenterColor = [System.Drawing.Color]::FromArgb(45, 99, 102, 241)
$innerGlow.SurroundColors = @([System.Drawing.Color]::FromArgb(0, 11, 15, 29))
$g.FillPath($innerGlow, $cardPath)
$innerGlow.Dispose()

# 6. Stylized "CM" Animated Design Typography
# Draw letter 'C' (Left side)
# C outer arc, C inner arc
$cPath = New-Object System.Drawing.Drawing2D.GraphicsPath

# C shape: Outer circle sweep, inner cutout, open jaw
$cx = 175
$cy = 256
$cR_out = 118
$cR_in = 64

# Add thick circular arc for C
$cPath.AddArc($cx - $cR_out, $cy - $cR_out, $cR_out * 2, $cR_out * 2, 42, 276)
$cPath.AddLine(242, 172, 202, 198)
$cPath.AddArc($cx - $cR_in, $cy - $cR_in, $cR_in * 2, $cR_in * 2, 318, -276)
$cPath.CloseFigure()

# C Gradient: Cyan -> Electric Blue
$cBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    (New-Object System.Drawing.Point 60, 130),
    (New-Object System.Drawing.Point 250, 380),
    [System.Drawing.Color]::FromArgb(255, 0, 242, 254),
    [System.Drawing.Color]::FromArgb(255, 59, 130, 246)
)

# Soft shadow under C
$cShadow = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(80, 0, 0, 0))
$matrix = New-Object System.Drawing.Drawing2D.Matrix
$matrix.Translate(6, 8)
$cPathShadow = $cPath.Clone()
$cPathShadow.Transform($matrix)
$g.FillPath($cShadow, $cPathShadow)
$g.FillPath($cBrush, $cPath)

# 7. Draw letter 'M' (Right side, overlapping with energetic angle)
$mPath = New-Object System.Drawing.Drawing2D.GraphicsPath

# Points for modern geometric M:
# Left pillar, valley, right pillar
$mP1 = New-Object System.Drawing.PointF 238, 368 # Left bottom
$mP2 = New-Object System.Drawing.PointF 238, 148 # Left top
$mP3 = New-Object System.Drawing.PointF 285, 148 # Left top inner
$mP4 = New-Object System.Drawing.PointF 340, 260 # Center valley
$mP5 = New-Object System.Drawing.PointF 395, 148 # Right top inner
$mP6 = New-Object System.Drawing.PointF 442, 148 # Right top
$mP7 = New-Object System.Drawing.PointF 442, 368 # Right bottom
$mP8 = New-Object System.Drawing.PointF 398, 368 # Right bottom inner
$mP9 = New-Object System.Drawing.PointF 398, 222 # Right mid
$mP10 = New-Object System.Drawing.PointF 355, 308 # Center apex inner right
$mP11 = New-Object System.Drawing.PointF 325, 308 # Center apex inner left
$mP12 = New-Object System.Drawing.PointF 282, 222 # Left mid
$mP13 = New-Object System.Drawing.PointF 282, 368 # Left bottom inner

$mPoints = [System.Drawing.PointF[]]@($mP1, $mP2, $mP3, $mP4, $mP5, $mP6, $mP7, $mP8, $mP9, $mP10, $mP11, $mP12, $mP13)
$mPath.AddPolygon($mPoints)

# M Gradient: Neon Indigo -> Fuchsia Pink -> Violet
$mBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    (New-Object System.Drawing.Point 238, 148),
    (New-Object System.Drawing.Point 442, 368),
    [System.Drawing.Color]::FromArgb(255, 129, 140, 248),
    [System.Drawing.Color]::FromArgb(255, 236, 72, 153)
)

$mPathShadow = $mPath.Clone()
$mPathShadow.Transform($matrix)
$g.FillPath($cShadow, $mPathShadow)
$g.FillPath($mBrush, $mPath)

# 8. Energetic Dynamic Accent / Motion Streak (Cutting across between C and M)
$streakPath = New-Object System.Drawing.Drawing2D.GraphicsPath
$sP1 = New-Object System.Drawing.PointF 195, 275
$sP2 = New-Object System.Drawing.PointF 265, 205
$sP3 = New-Object System.Drawing.PointF 278, 218
$sP4 = New-Object System.Drawing.PointF 208, 288
$streakPath.AddPolygon([System.Drawing.PointF[]]@($sP1, $sP2, $sP3, $sP4))
$streakBrush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(220, 255, 255, 255))
$g.FillPath($streakBrush, $streakPath)

# 9. Top-Right Sparkle / Energy Star
$starX = 420
$starY = 88
$starPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(240, 255, 255, 255), 2.5)
$g.DrawLine($starPen, $starX - 12, $starY, $starX + 12, $starY)
$g.DrawLine($starPen, $starX, $starY - 12, $starX, $starY + 12)
$starPen.Dispose()
$starDot = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(255, 0, 242, 254))
$g.FillEllipse($starDot, $starX - 4, $starY - 4, 8, 8)
$starDot.Dispose()

# 10. Glossy Top Reflection Arc
$glossPath = New-Object System.Drawing.Drawing2D.GraphicsPath
$glossPath.AddArc(38, 38, 436, 210, 180, 180)
$glossPath.CloseFigure()
$glossBrush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
    (New-Object System.Drawing.Point 256, 38),
    (New-Object System.Drawing.Point 256, 200),
    [System.Drawing.Color]::FromArgb(40, 255, 255, 255),
    [System.Drawing.Color]::FromArgb(0, 255, 255, 255)
)
$g.FillPath($glossBrush, $glossPath)

# Cleanup drawing
$g.Dispose()

# Ensure directories exist
if (-not (Test-Path "build")) { New-Item -ItemType Directory -Path "build" -Force | Out-Null }
if (-not (Test-Path "electron")) { New-Item -ItemType Directory -Path "electron" -Force | Out-Null }
if (-not (Test-Path "client/public")) { New-Item -ItemType Directory -Path "client/public" -Force | Out-Null }

# Save 512x512 Master PNGs
$bmp.Save("build/icon.png", [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Save("electron/icon.png", [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Save("client/public/cm-icon.png", [System.Drawing.Imaging.ImageFormat]::Png)

Write-Host "Created build/icon.png (512x512)"

# Create multi-resolution Windows ICO file containing 256, 128, 64, 48, 32, 16 sizes
function Export-IconFile($sourceBmp, $icoPath) {
    $sizes = @(256, 128, 64, 48, 32, 16)
    $pngStreams = @()
    
    foreach ($s in $sizes) {
        $resized = New-Object System.Drawing.Bitmap $s, $s
        $rg = [System.Drawing.Graphics]::FromImage($resized)
        $rg.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
        $rg.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $rg.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $rg.DrawImage($sourceBmp, 0, 0, $s, $s)
        $rg.Dispose()
        
        $ms = New-Object System.IO.MemoryStream
        $resized.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
        $resized.Dispose()
        $pngStreams += ,@($s, $ms.ToArray())
        $ms.Dispose()
    }
    
    $fs = New-Object System.IO.FileStream $icoPath, ([System.IO.FileMode]::Create)
    $bw = New-Object System.IO.BinaryWriter $fs
    
    # ICONDIR
    $bw.Write([uint16]0) # Reserved
    $bw.Write([uint16]1) # Type (1 = ICO)
    $bw.Write([uint16]$sizes.Count) # Image count
    
    # Calculate offset
    $offset = 6 + (16 * $sizes.Count)
    
    # ICONDIRENTRY list
    foreach ($entry in $pngStreams) {
        $imgSize = $entry[0]
        $bytes = $entry[1]
        
        $bw.Write([byte]$(if ($imgSize -eq 256) { 0 } else { $imgSize })) # Width
        $bw.Write([byte]$(if ($imgSize -eq 256) { 0 } else { $imgSize })) # Height
        $bw.Write([byte]0) # Colors
        $bw.Write([byte]0) # Reserved
        $bw.Write([uint16]1) # Color planes
        $bw.Write([uint16]32) # Bits per pixel
        $bw.Write([uint32]$bytes.Length) # Image size in bytes
        $bw.Write([uint32]$offset) # Offset
        
        $offset += $bytes.Length
    }
    
    # Write image data
    foreach ($entry in $pngStreams) {
        $bw.Write($entry[1])
    }
    
    $bw.Close()
    $fs.Close()
}

Export-IconFile $bmp "build/icon.ico"
Export-IconFile $bmp "electron/icon.ico"
$bmp.Dispose()

Write-Host "Successfully generated build/icon.ico and electron/icon.ico"
