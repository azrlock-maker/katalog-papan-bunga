# Membuat gambar contoh (placeholder) untuk katalog.
# Jalankan: powershell -ExecutionPolicy Bypass -File alat/buat-gambar.ps1
# Gambar ini hanya contoh. Ganti dengan foto asli papan bunga Anda.

Add-Type -AssemblyName System.Drawing

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$outDir = Join-Path $root 'gambar'
if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir | Out-Null }

function W([int]$r, [int]$g, [int]$b, [int]$a = 255) {
  return [System.Drawing.Color]::FromArgb($a, $r, $g, $b)
}

# Palet: bg1, bg2, bunga utama, bunga kedua, bunga ketiga, daun, aksen
$palettes = @(
  @{ bg1 = (W 16 48 38); bg2 = (W 8 30 23); p1 = (W 247 238 220); p2 = (W 214 178 106); p3 = (W 199 122 114); leaf = (W 58 96 74); accent = (W 214 178 106) },
  @{ bg1 = (W 62 20 28); bg2 = (W 38 12 18); p1 = (W 248 240 229); p2 = (W 226 190 176); p3 = (W 198 158 90); leaf = (W 76 92 70); accent = (W 214 178 106) },
  @{ bg1 = (W 18 34 54); bg2 = (W 9 19 33); p1 = (W 244 240 232); p2 = (W 214 178 106); p3 = (W 150 178 196); leaf = (W 52 82 84); accent = (W 214 178 106) },
  @{ bg1 = (W 46 66 52); bg2 = (W 26 42 32); p1 = (W 250 244 232); p2 = (W 232 200 170); p3 = (W 205 150 140); leaf = (W 78 104 76); accent = (W 226 196 132) },
  @{ bg1 = (W 32 30 38); bg2 = (W 18 17 23); p1 = (W 248 244 236); p2 = (W 220 196 150); p3 = (W 176 156 176); leaf = (W 62 74 62); accent = (W 212 180 118) },
  @{ bg1 = (W 54 38 60); bg2 = (W 32 21 38); p1 = (W 247 238 240); p2 = (W 206 176 208); p3 = (W 226 190 142); leaf = (W 70 88 76); accent = (W 220 188 128) }
)

function New-Background($g, $w, $h, $pal) {
  $rect = New-Object System.Drawing.Rectangle 0, 0, $w, $h
  $bg = New-Object System.Drawing.Drawing2D.LinearGradientBrush($rect, $pal.bg1, $pal.bg2, 55)
  $g.FillRectangle($bg, $rect)
  $bg.Dispose()

  $glow = New-Object System.Drawing.SolidBrush (W 255 255 255 18)
  $g.FillEllipse($glow, [int]($w * 0.45), [int](-$h * 0.35), [int]($w * 1.1), [int]($h * 1.1))
  $glow.Dispose()

  $vignette = New-Object System.Drawing.SolidBrush (W 0 0 0 40)
  $g.FillRectangle($vignette, 0, [int]($h * 0.72), $w, [int]($h * 0.28))
  $vignette.Dispose()
}

function Draw-Petal($g, [double]$cx, [double]$cy, [double]$rx, [double]$ry, [double]$angle, $color) {
  $path = New-Object System.Drawing.Drawing2D.GraphicsPath
  $path.AddEllipse([float]($cx - $rx), [float]($cy - $ry), [float]($rx * 2), [float]($ry * 2))
  $m = New-Object System.Drawing.Drawing2D.Matrix
  $m.RotateAt([float]$angle, (New-Object System.Drawing.PointF([float]$cx, [float]$cy)))
  $path.Transform($m)
  $brush = New-Object System.Drawing.SolidBrush $color
  $g.FillPath($brush, $path)
  $brush.Dispose()
  $m.Dispose()
  $path.Dispose()
}

function Draw-Leaf($g, [double]$cx, [double]$cy, [double]$len, [double]$wid, [double]$angle, $color) {
  Draw-Petal $g ($cx) ($cy) ($wid) ($len) $angle $color
}

function Draw-Flower($g, [double]$x, [double]$y, [double]$size, $pal, [int]$seed) {
  $rnd = New-Object System.Random $seed
  $leafCount = $rnd.Next(2, 5)
  for ($i = 0; $i -lt $leafCount; $i++) {
    $a = $rnd.Next(0, 360)
    $dist = $size * (0.9 + $rnd.NextDouble() * 0.5)
    $lx = $x + [Math]::Cos($a * [Math]::PI / 180) * $dist
    $ly = $y + [Math]::Sin($a * [Math]::PI / 180) * $dist
    Draw-Leaf $g $lx $ly ($size * 0.75) ($size * 0.2) ($a + 90) $pal.leaf
  }

  $petalColors = @($pal.p1, $pal.p2, $pal.p3)
  $layers = @(
    @{ r = $size; rx = ($size * 0.62); ry = ($size * 0.3); n = 5 },
    @{ r = ($size * 0.6); rx = ($size * 0.42); ry = ($size * 0.22); n = 5 }
  )
  foreach ($layer in $layers) {
    $offset = $rnd.Next(0, 40)
    for ($i = 0; $i -lt $layer.n; $i++) {
      $a = $offset + ($i * (360 / $layer.n))
      $px = $x + [Math]::Cos($a * [Math]::PI / 180) * $layer.r
      $py = $y + [Math]::Sin($a * [Math]::PI / 180) * $layer.r
      $col = $petalColors[$i % $petalColors.Count]
      Draw-Petal $g $px $py $layer.rx $layer.ry $a $col
    }
  }

  $c = New-Object System.Drawing.SolidBrush $pal.accent
  $g.FillEllipse($c, [float]($x - $size * 0.22), [float]($y - $size * 0.22), [float]($size * 0.44), [float]($size * 0.44))
  $c.Dispose()
}

function Draw-Cluster($g, [double]$x, [double]$y, [double]$scale, $pal, [int]$seed, [bool]$flip) {
  $s = 1
  if ($flip) { $s = -1 }
  Draw-Flower $g $x $y ($scale * 46) $pal ($seed + 1)
  Draw-Flower $g ($x + $s * $scale * 58) ($y + $scale * 34) ($scale * 30) $pal ($seed + 2)
  Draw-Flower $g ($x - $s * $scale * 16) ($y + $scale * 74) ($scale * 24) $pal ($seed + 3)
  Draw-Flower $g ($x + $s * $scale * 34) ($y + $scale * 104) ($scale * 17) $pal ($seed + 4)
}

function Draw-Frame($g, $w, $h, $pal) {
  $pen = New-Object System.Drawing.Pen $pal.accent, 2
  $g.DrawRectangle($pen, 30, 30, $w - 60, $h - 60)
  $pen.Dispose()
  $inner = New-Object System.Drawing.Pen (W 255 255 255 38), 1
  $g.DrawRectangle($inner, 44, 44, $w - 88, $h - 88)
  $inner.Dispose()
}

function Draw-Spaced($g, [string]$text, $font, $color, [int]$centerX, [int]$y, [double]$spacing) {
  $widths = @()
  foreach ($ch in $text.ToCharArray()) {
    $widths += $g.MeasureString([string]$ch, $font).Width
  }
  $total = ($widths | Measure-Object -Sum).Sum + ($spacing * ($text.Length - 1))
  $x = $centerX - ($total / 2)
  $brush = New-Object System.Drawing.SolidBrush $color
  for ($i = 0; $i -lt $text.Length; $i++) {
    $g.DrawString([string]$text[$i], $font, $brush, [float]$x, [float]$y)
    $x += $widths[$i] + $spacing
  }
  $brush.Dispose()
}

function Draw-Centered($g, [string]$text, $font, $color, [int]$centerX, [int]$y, [int]$boxWidth = 1000) {  $brush = New-Object System.Drawing.SolidBrush $color
  $sf = New-Object System.Drawing.StringFormat
  $sf.Alignment = [System.Drawing.StringAlignment]::Center
  $rect = New-Object System.Drawing.RectangleF ([float]($centerX - $boxWidth / 2)), ([float]$y), ([float]$boxWidth), 300
  $g.DrawString($text, $font, $brush, $rect, $sf)
  $brush.Dispose()
  $sf.Dispose()
  return ($g.MeasureString($text, $font, [int]$boxWidth).Height)
}

function Save-Papan {
  param(
    [string]$File,
    [string]$Kategori,
    [string[]]$Baris,
    [int]$Palette,
    [int]$Seed,
    [int]$Width = 1200,
    [int]$Height = 900,
    [bool]$Hero = $false
  )

  $pal = $palettes[$Palette % $palettes.Count]
  $bmp = New-Object System.Drawing.Bitmap $Width, $Height
  $bmp.SetResolution(96, 96)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
  $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic

  New-Background $g $Width $Height $pal
  Draw-Frame $g $Width $Height $pal

  Draw-Cluster $g 90 80 1.15 $pal ($Seed + 10) $false
  Draw-Cluster $g ($Width - 90) 80 1.15 $pal ($Seed + 20) $true
  Draw-Cluster $g 70 ($Height - 70) 0.7 $pal ($Seed + 30) $false
  Draw-Cluster $g ($Width - 70) ($Height - 70) 0.7 $pal ($Seed + 40) $true

  $fontBrand = New-Object System.Drawing.Font 'Georgia', 15, ([System.Drawing.FontStyle]::Regular)
  $fontCat = New-Object System.Drawing.Font 'Segoe UI', 14, ([System.Drawing.FontStyle]::Regular)
  $fontLine = New-Object System.Drawing.Font 'Georgia', 58, ([System.Drawing.FontStyle]::Regular)

  Draw-Spaced $g 'AKIO FLORIST' $fontBrand $pal.accent ([int]($Width / 2)) 110 6

  $accentPen = New-Object System.Drawing.Pen $pal.accent, 1
  $g.DrawLine($accentPen, [int]($Width / 2 - 170), 148, [int]($Width / 2 - 100), 148)
  $g.DrawLine($accentPen, [int]($Width / 2 + 100), 148, [int]($Width / 2 + 170), 148)
  $accentPen.Dispose()

  if ($Hero) {
    $heroFont = New-Object System.Drawing.Font 'Georgia', 68, ([System.Drawing.FontStyle]::Regular)
    $startY = 300
    foreach ($line in $Baris) {
      $hgt = Draw-Centered $g $line $heroFont $pal.p1 ([int]($Width / 2)) $startY 980
      $startY += [int]($hgt * 0.72)
    }
    $subFont = New-Object System.Drawing.Font 'Segoe UI', 17, ([System.Drawing.FontStyle]::Regular)
    Draw-Centered $g 'Dirangkai segar, dikirim tepat waktu' $subFont (W 255 255 255 180) ([int]($Width / 2)) 660 900
    $heroFont.Dispose()
    $subFont.Dispose()
  } else {
    $catFont = New-Object System.Drawing.Font 'Segoe UI', 13, ([System.Drawing.FontStyle]::Regular)
    Draw-Spaced $g $Kategori.ToUpper() $catFont $pal.accent ([int]($Width / 2)) 250 4

    $startY = 330
    foreach ($line in $Baris) {
      $hgt = Draw-Centered $g $line $fontLine $pal.p1 ([int]($Width / 2)) $startY 920
      $startY += [int]($hgt * 0.68)
    }

    $divider = New-Object System.Drawing.Pen $pal.accent, 1
    $g.DrawLine($divider, [int]($Width / 2 - 40), 690, [int]($Width / 2 + 40), 690)
    $divider.Dispose()
  }

  $fontFoot = New-Object System.Drawing.Font 'Segoe UI', 12, ([System.Drawing.FontStyle]::Regular)
  Draw-Spaced $g 'PAPAN BUNGA - PADANG PANJANG' $fontFoot (W 255 255 255 160) ([int]($Width / 2)) ($Height - 108) 3

  $bmp.Save((Join-Path $outDir $File), [System.Drawing.Imaging.ImageFormat]::Jpeg)
  $g.Dispose()
  $bmp.Dispose()
  $fontBrand.Dispose(); $fontCat.Dispose(); $fontLine.Dispose(); $fontFoot.Dispose()
  Write-Host "  dibuat: $File"
}

Write-Host 'Membuat gambar contoh...'

Save-Papan -File 'hero.jpg' -Kategori '' -Baris @('Papan Bunga', 'untuk Setiap', 'Momen Berharga') -Palette 0 -Seed 3 -Height 1050 -Hero $true
Save-Papan -File 'papan-bunga-ucapan-selamat.jpg' -Kategori 'Ucapan Selamat' -Baris @('Selamat &', 'Sukses') -Palette 3 -Seed 11
Save-Papan -File 'papan-bunga-duka-cita.jpg' -Kategori 'Duka Cita' -Baris @('Turut', 'Berbelasungkawa') -Palette 0 -Seed 21
Save-Papan -File 'papan-bunga-grand-opening.jpg' -Kategori 'Grand Opening' -Baris @('Grand', 'Opening') -Palette 2 -Seed 31
Save-Papan -File 'papan-bunga-wisuda.jpg' -Kategori 'Ucapan Selamat' -Baris @('Selamat', 'Wisuda') -Palette 5 -Seed 41
Save-Papan -File 'papan-bunga-pernikahan.jpg' -Kategori 'Pernikahan' -Baris @('Selamat', 'Menikah') -Palette 4 -Seed 51
Save-Papan -File 'papan-bunga-custom-nama.jpg' -Kategori 'Custom' -Baris @('Nama', 'Anda') -Palette 1 -Seed 61
Save-Papan -File 'papan-bunga-bentuk-hati.jpg' -Kategori 'Custom' -Baris @('With', 'Love') -Palette 1 -Seed 71
Save-Papan -File 'papan-bunga-duka-cita-islami.jpg' -Kategori 'Duka Cita' -Baris @('Innalillahi', 'wa Inna Ilaihi', 'Raji''un') -Palette 0 -Seed 91
Save-Papan -File 'papan-bunga-peresmian-kantor.jpg' -Kategori 'Grand Opening' -Baris @('Selamat', 'Peresmian') -Palette 2 -Seed 101

# Gambar untuk pratinjau saat dibagikan di media sosial (1200 x 630)
$w = 1200; $h = 630
$bmp = New-Object System.Drawing.Bitmap $w, $h
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
$rect = New-Object System.Drawing.Rectangle 0, 0, $w, $h
$bg = New-Object System.Drawing.Drawing2D.LinearGradientBrush $rect, (W 250 247 240), (W 241 233 219), 20
$g.FillRectangle($bg, $rect)
$bg.Dispose()
$pal = $palettes[0]
$pen = New-Object System.Drawing.Pen (W 22 74 56), 3
$g.DrawRectangle($pen, 28, 28, $w - 56, $h - 56)
$pen.Dispose()
Draw-Cluster $g 40 40 0.8 $pal 201 $false
Draw-Cluster $g ($w - 40) ($h - 40) 0.8 $pal 211 $true
$fBrand = New-Object System.Drawing.Font 'Georgia', 26, ([System.Drawing.FontStyle]::Regular)
Draw-Spaced $g 'AKIO FLORIST' $fBrand (W 22 74 56) ([int]($w / 2)) 120 8
$fTitle = New-Object System.Drawing.Font 'Georgia', 54, ([System.Drawing.FontStyle]::Regular)
Draw-Centered $g 'Papan Bunga untuk' $fTitle (W 24 40 32) ([int]($w / 2)) 240 1000
Draw-Centered $g 'Setiap Momen Berharga' $fTitle (W 24 40 32) ([int]($w / 2)) 320 1000
$fSub = New-Object System.Drawing.Font 'Segoe UI', 20, ([System.Drawing.FontStyle]::Regular)
Draw-Centered $g 'Ucapan - Duka Cita - Grand Opening - Custom' $fSub (W 90 86 78) ([int]($w / 2)) 460 1000
$bmp.Save((Join-Path $outDir 'og-default.jpg'), [System.Drawing.Imaging.ImageFormat]::Jpeg)
$g.Dispose(); $bmp.Dispose(); $fBrand.Dispose(); $fTitle.Dispose(); $fSub.Dispose()

Write-Host 'Selesai.'
