#!/usr/bin/env bash
# Kompres gambar di folder gambar/ (Linux/Cloudflare build environment).
# - Resize bila lebar > 1600 px (jaga rasio).
# - JPEG quality 82, PNG disimpan ulang.
# - Abaikan jika tool tidak tersedia (tidak menggagalkan build).
# Jalankan: bash alat/kompres-gambar.sh  (lalu node build.js)

set +e

FOLDER="gambar"
if [ ! -d "$FOLDER" ]; then
  echo "Folder $FOLDER tidak ditemukan, lewati kompresi."
  exit 0
fi

# Cari tool yang tersedia
if command -v convert >/dev/null 2>&1; then
  TOOL="imagemagick"
elif command -v magick >/dev/null 2>&1; then
  TOOL="magick"
else
  echo "ImageMagick tidak tersedia, lewati kompresi otomatis."
  exit 0
fi

echo "Menggunakan $TOOL untuk kompresi..."

for f in "$FOLDER"/*; do
  case "$f" in
    *.jpg|*.jpeg|*.png|*.JPG|*.JPEG|*.PNG)
      ;;
    *)
      continue
      ;;
  esac

  [ -f "$f" ] || continue

  # Resize bila lebar > 1600, quality 82 untuk JPEG
  if [ "$TOOL" = "imagemagick" ]; then
    convert "$f" -resize '1600>' -quality 82 "$f" 2>/dev/null
  else
    magick "$f" -resize '1600>' -quality 82 "$f" 2>/dev/null
  fi

  if [ $? -eq 0 ]; then
    echo "Dikompres: $f"
  else
    echo "Gagal kompres: $f (dilewati)"
  fi
done

echo "Kompresi selesai."
exit 0