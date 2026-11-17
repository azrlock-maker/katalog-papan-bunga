/**
 * Pemeriksaan cepat sebelum website dipublikasikan.
 * Jalankan: node alat/periksa.js
 */

const fs = require("fs");
const path = require("path");

const DIST = path.join(__dirname, "..", "dist");
const masalah = [];
const peringatan = [];

const daftarHtml = [];
const telusuri = (folder) => {
  for (const isi of fs.readdirSync(folder, { withFileTypes: true })) {
    const penuh = path.join(folder, isi.name);
    if (isi.isDirectory()) telusuri(penuh);
    else if (isi.name.endsWith(".html")) daftarHtml.push(penuh);
  }
};
telusuri(DIST);

const adaBerkas = (jalur) => {
  let bersih = decodeURIComponent(jalur.split("?")[0].split("#")[0]);
  if (bersih === "/") bersih = "/index.html";
  let berkas = path.join(DIST, bersih);
  if (fs.existsSync(berkas) && fs.statSync(berkas).isDirectory()) berkas = path.join(berkas, "index.html");
  return fs.existsSync(berkas);
};

const idGanda = new Map();

for (const berkas of daftarHtml) {
  const html = fs.readFileSync(berkas, "utf8");
  const relatif = path.relative(DIST, berkas).replace(/\\/g, "/");

  if (!/<title>[^<]{10,}<\/title>/.test(html)) masalah.push(`${relatif}: judul halaman kosong`);
  if (!/<meta name="description" content="[^"]{40,}"/.test(html)) masalah.push(`${relatif}: meta description tidak ada/kurang panjang`);
  if (!/<h1[ >]/.test(html)) masalah.push(`${relatif}: tidak ada H1`);
  if (/<img(?![^>]*\balt=)/.test(html)) masalah.push(`${relatif}: ada gambar tanpa alt`);

  const ids = [...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
  const ganda = ids.filter((id, i) => ids.indexOf(id) !== i);
  if (ganda.length) masalah.push(`${relatif}: id ganda -> ${[...new Set(ganda)].join(", ")}`);

  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try {
      JSON.parse(m[1]);
    } catch (e) {
      masalah.push(`${relatif}: JSON-LD tidak valid (${e.message})`);
    }
  }

  for (const m of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    let jalur = m[1];
    if (/^(https?:|mailto:|tel:|data:|#)/.test(jalur)) continue;
    if (!jalur.startsWith("/")) {
      masalah.push(`${relatif}: tautan relatif "${jalur}" (gunakan /...)`);
      continue;
    }
    if (!adaBerkas(jalur)) masalah.push(`${relatif}: tautan rusak -> ${jalur}`);
  }

  if (/netlify\.app/.test(html)) peringatan.push("alamat website masih memakai contoh netlify.app");
  if (/6281234567890/.test(html)) peringatan.push("nomor WhatsApp masih memakai contoh 6281234567890");
}

console.log(`Diperiksa: ${daftarHtml.length} halaman HTML`);
if (peringatan.length) {
  console.log("\nPeringatan (wajar saat masih uji coba):");
  for (const p of [...new Set(peringatan)]) console.log("  - " + p);
}
if (masalah.length) {
  console.log("\nMASALAH:");
  for (const m of masalah) console.log("  - " + m);
  process.exitCode = 1;
} else {
  console.log("\nTidak ada masalah tautan/gambar/meta yang ditemukan.");
}
