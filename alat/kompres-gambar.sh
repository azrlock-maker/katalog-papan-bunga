#!/usr/bin/env bash
# Kompres & konversi gambar di folder gambar/ (Linux/Cloudflare build environment).
# - Resize bila lebar > 1600 px (jaga rasio).
# - JPEG quality 82.
# - Konversi ke WebP (jika tool tersedia) untuk file yang belum punya .webp.
# - Abaikan jika tool tidak tersedia (tidak menggagalkan build).
# Jalankan: bash alat/kompres-gambar.sh  (lalu node build.js)

set +e

FOLDER="gambar"
if [ ! -d "$FOLDER" ]; then
  echo "Folder $FOLDER tidak ditemukan, lewati kompresi."
  exit 0
fi

# Cari tool yang tersedia
if command -v magick >/dev/null 2>&1; then
  TOOL="magick"
elif command -v convert >/dev/null 2>&1; then
  TOOL="convert"
else
  echo "ImageMagick tidak tersedia, lewati kompresi otomatis."
  exit 0
fi

echo "Menggunakan $TOOL untuk kompresi & konversi WebP..."

for f in "$FOLDER"/*; do
  case "$f" in
    *.jpg|*.jpeg|*.png|*.JPG|*.JPEG|*.PNG)
      ;;
    *)
      continue
      ;;
  esac

  [ -f "$f" ] || continue

  base="${f%.*}"
  webp="${base}.webp"

  # Konversi ke WebP jika belum ada
  if [ ! -f "$webp" ]; then
    if [ "$TOOL" = "magick" ]; then
      magick "$f" -resize '1600>' -quality 82 "$webp" 2>/dev/null
    else
      convert "$f" -resize '1600>' -quality 82 "$webp" 2>/dev/null
    fi
    if [ $? -eq 0 ]; then
      echo "Dikonversi ke WebP: $f -> $webp"
    fi
  fi

  # Kompres file asli
  if [ "$TOOL" = "magick" ]; then
    magick "$f" -resize '1600>' -quality 82 "$f" 2>/dev/null
  else
    convert "$f" -resize '1600>' -quality 82 "$f" 2>/dev/null
  fi
  if [ $? -eq 0 ]; then
    echo "Dikompres: $f"
  else
    echo "Gagal kompres: $f (dilewati)"
  fi
done

echo "Kompresi & konversi selesai."
exit 0