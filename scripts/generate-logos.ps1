<#
.SYNOPSIS
    Generates PNG versions of the FastDataUpload icon logo.

.DESCRIPTION
    Renders the square "icon" mark (gradient rounded square + white upload
    arrow with motion lines) at several sizes using System.Drawing, so the
    PNG assets stay in sync with the SVG masters in frontend/public.

    Output: frontend/public/logo-icon-<size>.png
#>

Add-Type -AssemblyName System.Drawing

function New-RoundedRectPath {
    param(
        [float]$X, [float]$Y, [float]$W, [float]$H, [float]$Radius
    )
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $d = $Radius * 2
    $path.AddArc($X, $Y, $d, $d, 180, 90)
    $path.AddArc($X + $W - $d, $Y, $d, $d, 270, 90)
    $path.AddArc($X + $W - $d, $Y + $H - $d, $d, $d, 0, 90)
    $path.AddArc($X, $Y + $H - $d, $d, $d, 90, 90)
    $path.CloseFigure()
    return $path
}

function New-IconPng {
    param(
        [int]$Size,
        [string]$OutFile
    )

    $scale = $Size / 64.0
    $bmp = New-Object System.Drawing.Bitmap($Size, $Size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.Clear([System.Drawing.Color]::Transparent)

    # Gradient rounded square background
    $margin = 2.0 * $scale
    $rect = New-Object System.Drawing.RectangleF($margin, $margin, ($Size - 2 * $margin), ($Size - 2 * $margin))
    $path = New-RoundedRectPath -X $rect.X -Y $rect.Y -W $rect.Width -H $rect.Height -Radius (17.0 * $scale)
    $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush(
        $rect,
        [System.Drawing.ColorTranslator]::FromHtml('#2563eb'),
        [System.Drawing.ColorTranslator]::FromHtml('#10b981'),
        [System.Drawing.Drawing2D.LinearGradientMode]::ForwardDiagonal)
    $g.FillPath($brush, $path)

    # Motion lines (semi transparent white)
    $lineColor = [System.Drawing.Color]::FromArgb(153, 255, 255, 255)
    $linePen = New-Object System.Drawing.Pen($lineColor, (3.0 * $scale))
    $linePen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $linePen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $lines = @(
        @(9, 27, 19, 27),
        @(7, 35, 17, 35),
        @(9, 43, 19, 43)
    )
    foreach ($l in $lines) {
        $g.DrawLine($linePen, ([float]($l[0] * $scale)), ([float]($l[1] * $scale)), ([float]($l[2] * $scale)), ([float]($l[3] * $scale)))
    }

    # Upload arrow (solid white)
    $arrowPen = New-Object System.Drawing.Pen([System.Drawing.Color]::White, (5.0 * $scale))
    $arrowPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
    $arrowPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
    $arrowPen.LineJoin = [System.Drawing.Drawing2D.LineJoin]::Round
    $arrow = @(
        [System.Drawing.PointF]::new([float](41 * $scale), [float](46 * $scale)),
        [System.Drawing.PointF]::new([float](41 * $scale), [float](25 * $scale)),
        [System.Drawing.PointF]::new([float](32 * $scale), [float](34 * $scale)),
        [System.Drawing.PointF]::new([float](41 * $scale), [float](24 * $scale)),
        [System.Drawing.PointF]::new([float](50 * $scale), [float](34 * $scale))
    )
    $g.DrawLines($arrowPen, $arrow)

    $g.Dispose()
    $bmp.Save($OutFile, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()

    Write-Host "wrote $OutFile ($Size x $Size)"
}

$publicDir = Join-Path $PSScriptRoot '..\frontend\public'
$publicDir = (Resolve-Path $publicDir).Path

foreach ($size in 512, 256, 128, 64) {
    New-IconPng -Size $size -OutFile (Join-Path $publicDir "logo-icon-$size.png")
}

Write-Host 'Done.'
