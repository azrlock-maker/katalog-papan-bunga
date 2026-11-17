# Kompresi gambar di folder gambar/ (Windows PowerShell).
# - Resize bila lebar > 1600 px (jaga rasio).
# - JPEG quality 82, PNG disimpan ulang.
# - Backup asli ke gambar-backup/ (sekali saja).
# Jalankan dari folder katalog-papan-bunga:  powershell -ExecutionPolicy Bypass -File alat\kompres-gambar.ps1

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing

$root = Split-Path -Parent $PSScriptRoot
$folderGambar = Join-Path $root "gambar"
$folderBackup = Join-Path $root "gambar-backup"

if (-not (Test-Path $folderGambar)) { Write-Host "Folder gambar tidak ditemukan."; exit 1 }

if (-not (Test-Path $folderBackup)) {
  New-Item -ItemType Directory -Path $folderBackup | Out-Null
  Copy-Item -Path (Join-Path $folderGambar "*") -Destination $folderBackup -Recurse -Force
  Write-Host "Backup dibuat di gambar-backup/"
}

$ekstensi = @("*.jpg", "*.jpeg", "*.png")
$berkas = @()
foreach ($pola in $ekstensi) { $berkas += Get-ChildItem -Path $folderGambar -Filter $pola -File }

foreach ($file in $berkas) {
  $img = [System.Drawing.Image]::FromFile($file.FullName)
  try {
    $lebarAsli = $img.Width
    $tinggiAsli = $img.Height
    $maxLebar = 1600
    $perluResize = $lebarAsli -gt $maxLebar
    $lebarBaru = if ($perluResize) { $maxLebar } else { $lebarAsli }
    $tinggiBaru = if ($perluResize) { [int]($tinggiAsli * $maxLebar / $lebarAsli) } else { $tinggiAsli }

    $bmp = New-Object System.Drawing.Bitmap($lebarBaru, $tinggiBaru)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.DrawImage($img, 0, 0, $lebarBaru, $tinggiBaru)
    $g.Dispose()

    $ekst = $file.Extension.ToLower()
    if ($ekst -eq ".png") {
      $bmp.Save($file.FullName, [System.Drawing.Imaging.ImageFormat]::Png)
    } else {
      $codec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq "image/jpeg" }
      $encoderParams = New-Object System.Drawing.Imaging.EncoderParameters(1)
      $encoderParams.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter([System.Drawing.Imaging.Encoder]::Quality, 82)
      $bmp.Save($file.FullName, $codec, $encoderParams)
    }
    $bmp.Dispose()
    Write-Host ("Dikompres: {0} ({1}x{2} -> {3}x{4})" -f $file.Name, $lebarAsli, $tinggiAsli, $lebarBaru, $tinggiBaru)
  } finally {
    $img.Dispose()
  }
}

Write-Host "Selesai. Jalankan 'node build.js' untuk membangun ulang website."