#!/usr/bin/env node
/**
 * Optimizer gambar katalog AKIO FLORIST.
 *
 * - Membuat/memperbarui file .webp di sebelah gambar sumber.
 * - Mencari kombinasi ukuran + kualitas WebP terbaik sampai <= target KB.
 * - Menulis ulang referensi gambar di semua berkas .json di dalam data/
 *   dari .jpg/.png ke .webp.
 *
 * Dipakai oleh .github/workflows/kompres-gambar.yml (GitHub Actions).
 * Bisa juga dijalankan lokal:
 *   npm install --prefix .github/imgopt
 *   node .github/imgopt/optimize.mjs --all
 *   node .github/imgopt/optimize.mjs gambar/foto.jpg --target-kb 200
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "..", "..");
const GAMBAR = path.join(ROOT, "gambar");
const DATA = path.join(ROOT, "data");

const EXT = /\.(jpe?g|png|webp|heic|heif|bmp|tiff?)$/i;
const SKALA = [1, 0.85, 0.7, 0.55, 0.42, 0.32];
const KUALITAS = [82, 76, 70, 64, 58, 52, 46, 40, 34];

function bacaArgumen() {
  const argv = process.argv.slice(2);
  const opsi = { semua: false, targetKb: 200, maxEdge: 1600, file: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--all" || a === "-a") opsi.semua = true;
    else if (a === "--target-kb") opsi.targetKb = Number(argv[++i]) || 200;
    else if (a.startsWith("--target-kb=")) opsi.targetKb = Number(a.split("=")[1]) || 200;
    else if (a === "--max-edge") opsi.maxEdge = Number(argv[++i]) || 1600;
    else if (a.startsWith("--max-edge=")) opsi.maxEdge = Number(a.split("=")[1]) || 1600;
    else if (!a.startsWith("--")) opsi.file.push(a);
  }
  return opsi;
}

function rel(p) {
  return path.relative(ROOT, p).split(path.sep).join("/");
}

function kb(n) {
  return n < 1024 * 1024
    ? Math.round(n / 1024) + " KB"
    : (n / 1024 / 1024).toFixed(2) + " MB";
}

function pindai(folder, hasil = []) {
  if (!fs.existsSync(folder)) return hasil;
  for (const entri of fs.readdirSync(folder, { withFileTypes: true })) {
    const p = path.join(folder, entri.name);
    if (entri.isDirectory()) pindai(p, hasil);
    else if (EXT.test(entri.name)) hasil.push(p);
  }
  return hasil;
}

function pindaiJson(folder, hasil = []) {
  if (!fs.existsSync(folder)) return hasil;
  for (const entri of fs.readdirSync(folder, { withFileTypes: true })) {
    const p = path.join(folder, entri.name);
    if (entri.isDirectory()) pindaiJson(p, hasil);
    else if (entri.name.toLowerCase().endsWith(".json")) hasil.push(p);
  }
  return hasil;
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function optimalkan(file, targetBytes, maxEdge) {
  const ekstensi = path.extname(file).toLowerCase();
  const webp = file.replace(/\.[^./\\]+$/, ".webp");
  const ukuranAwal = fs.statSync(file).size;

  // File WebP yang sudah memenuhi target tidak perlu diproses lagi.
  if (ekstensi === ".webp" && ukuranAwal <= targetBytes) {
    console.log(`  lewati (sudah ${kb(ukuranAwal)}): ${rel(webp)}`);
    return { webp, diubah: false };
  }

  // WebP hasil lama masih valid dan sumber tidak berubah -> lewati.
  if (ekstensi !== ".webp" && fs.existsSync(webp)) {
    const webpStat = fs.statSync(webp);
    const sumberStat = fs.statSync(file);
    if (
      webpStat.size <= targetBytes &&
      sumberStat.mtimeMs <= webpStat.mtimeMs
    ) {
      console.log(`  lewati (webp sudah ada): ${rel(webp)}`);
      return { webp, diubah: false };
    }
  }

  const buffer = fs.readFileSync(file);
  let meta;
  try {
    meta = await sharp(buffer, { failOn: "none" }).metadata();
  } catch (e) {
    console.warn(`  gagal dibaca: ${rel(file)} (${e.message})`);
    return null;
  }

  let lebar = meta.width;
  let tinggi = meta.height;
  if (!lebar || !tinggi) {
    console.warn(`  dilewati (dimensi tidak terbaca): ${rel(file)}`);
    return null;
  }
  if (meta.orientation >= 5 && meta.orientation <= 8) {
    [lebar, tinggi] = [tinggi, lebar];
  }

  const faktor = Math.min(1, maxEdge / Math.max(lebar, tinggi));
  const dasarLebar = Math.max(1, Math.round(lebar * faktor));
  const dasarTinggi = Math.max(1, Math.round(tinggi * faktor));

  let terbaik = null;

  luar: for (const skala of SKALA) {
    const w = Math.max(1, Math.round(dasarLebar * skala));
    const h = Math.max(1, Math.round(dasarTinggi * skala));
    for (const q of KUALITAS) {
      let hasil;
      try {
        hasil = await sharp(buffer, { failOn: "none" })
          .rotate()
          .resize(w, h, { fit: "inside", withoutEnlargement: true })
          .webp({ quality: q, effort: 6 })
          .toBuffer();
      } catch (e) {
        console.warn(`  gagal encode q=${q}: ${rel(file)} (${e.message})`);
        continue;
      }
      if (!terbaik || hasil.length < terbaik.buffer.length) {
        terbaik = { buffer: hasil, q, w, h };
      }
      if (hasil.length <= targetBytes) break luar;
    }
  }

  if (!terbaik) {
    console.warn(`  dilewati (tidak bisa diencode): ${rel(file)}`);
    return null;
  }

  const ukuranLama = fs.existsSync(webp) ? fs.statSync(webp).size : Infinity;
  let diubah = false;
  if (terbaik.buffer.length < ukuranLama) {
    fs.writeFileSync(webp, terbaik.buffer);
    diubah = true;
  }

  console.log(
    `  ${rel(file)} (${kb(ukuranAwal)}) -> ${rel(webp)} (${kb(terbaik.buffer.length)}, q=${terbaik.q}, ${terbaik.w}x${terbaik.h})`
  );
  return { webp, diubah };
}

function perbaruiJson(pasangan) {
  const daftar = new Map();
  for (const item of pasangan) {
    if (!item) continue;
    const dari = path.basename(item.webp).replace(/\.webp$/i, "");
    daftar.set(dari.toLowerCase(), { dari, ke: path.basename(item.webp) });
  }
  if (!daftar.size) return;

  for (const berkas of pindaiJson(DATA)) {
    const asli = fs.readFileSync(berkas, "utf8");
    let baru = asli;

    for (const { dari, ke } of daftar.values()) {
      const pola = new RegExp(escapeRegex(dari) + "\\.(jpe?g|png|webp|bmp|tiff?)", "gi");
      baru = baru.replace(pola, ke);
    }

    if (baru !== asli) {
      fs.writeFileSync(berkas, baru, "utf8");
      console.log(`  JSON diperbarui: ${rel(berkas)}`);
    }
  }
}

async function utama() {
  const opsi = bacaArgumen();
  const targetBytes = Math.max(1, opsi.targetKb) * 1024;

  let daftarFile;
  if (opsi.semua) {
    daftarFile = pindai(GAMBAR);
    console.log(`Mode: semua gambar di gambar/ (${daftarFile.length} file)`);
  } else {
    daftarFile = opsi.file
      .map((f) => path.resolve(ROOT, f))
      .filter((f) => EXT.test(f) && fs.existsSync(f) && f.startsWith(ROOT));
    console.log(`Mode: ${daftarFile.length} file dari argumen`);
  }

  if (!daftarFile.length) {
    console.log("Tidak ada gambar yang perlu diproses.");
    return;
  }

  console.log(`Target: <= ${opsi.targetKb} KB | sisi maksimal: ${opsi.maxEdge} px`);
  const hasil = [];
  for (const file of daftarFile) {
    hasil.push(await optimalkan(file, targetBytes, opsi.maxEdge));
  }

  perbaruiJson(hasil.filter(Boolean));

  const dibuat = hasil.filter((h) => h && h.diubah).length;
  console.log(`Selesai. ${dibuat} file WebP ditulis/diperbarui.`);
}

utama().catch((e) => {
  console.error("Optimizer gagal:", e);
  process.exit(1);
});
