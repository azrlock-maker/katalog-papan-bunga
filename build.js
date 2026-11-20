#!/usr/bin/env node
/**
 * Generator website katalog papan bunga.
 *
 * Semua isi website diambil dari folder data/:
 *   - data/toko.json     -> identitas toko, kontak, area pengiriman
 *   - data/katalog.json  -> daftar produk papan bunga
 *   - data/kategori.json -> daftar kategori
 *
 * Jalankan:  node build.js
 * Hasil:     folder dist/ (siap diunggah ke hosting)
 */

const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const DIST = path.join(ROOT, "dist");

const crypto = require("crypto");
const hashFile = (rel) => {
  try {
    const buf = fs.readFileSync(path.join(ROOT, rel));
    return crypto.createHash("sha256").update(buf).digest("hex").slice(0, 10);
  } catch (e) {
    return String(Date.now());
  }
};
const CSS_HASH = hashFile("aset/style.css");
const JS_HASH = hashFile("aset/app.js");
const CSS_URL = `/aset/main.${CSS_HASH}.css`;
const JS_URL = `/aset/app.${JS_HASH}.js`;

const bacaJson = (nama) => JSON.parse(fs.readFileSync(path.join(ROOT, "data", nama), "utf8"));
const toko = bacaJson("toko.json");
let kategori = bacaJson("kategori.json");
let produk = bacaJson("katalog.json");
let testimoni = [];
try {
  testimoni = bacaJson("testimoni.json");
  if (!Array.isArray(testimoni)) testimoni = [];
} catch (e) {
  testimoni = [];
}

let galeri = [];
try {
  const dir = path.join(ROOT, "data", "galeri");
  if (fs.existsSync(dir)) {
    const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));
    galeri = files.map((f) => {
      try {
        const g = JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"));
        return {
          judul: g.judul || g.nama || "Orderan papan bunga",
          gambar: Array.isArray(g.gambar) ? g.gambar : g.gambar ? [g.gambar] : [],
          tanggal: g.tanggal || "",
          tags: Array.isArray(g.tags) ? g.tags : [],
        };
      } catch (e) {
        return null;
      }
    }).filter((g) => g && g.gambar.length > 0);
  }
} catch (e) {
  galeri = [];
}

/* ----------------------------- Utilitas -------------------------------- */

const esc = (nilai) =>
  String(nilai == null ? "" : nilai).replace(/[&<>"']/g, (huruf) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[huruf]);

const rupiah = (angka) => "Rp " + Number(angka).toLocaleString("id-ID");

const rupiahSingkat = (angka) => {
  const n = Number(angka);
  if (n >= 1000000) return "Rp " + (n / 1000000).toLocaleString("id-ID", { maximumFractionDigits: 1 }) + " jt";
  if (n >= 1000) return "Rp " + Math.round(n / 1000) + " rb";
  return rupiah(n);
};

const tanpaGarisMiring = (nilai) => String(nilai).replace(/\/+$/, "");
const alamatAbsolut = (jalur) => tanpaGarisMiring(toko.url) + jalur;

const nomorWa = String(toko.whatsapp || "").replace(/\D/g, "");
const logoToko = toko.logo
  ? /^https?:\/\//.test(toko.logo) || toko.logo.startsWith("/")
    ? toko.logo
    : "/" + toko.logo
  : "";

const webpJikaAda = (src) => {
  if (!src || /^https?:\/\//.test(src)) return null;
  const webp = src.replace(/\.(jpe?g|png)$/i, ".webp");
  if (webp === src) return null;
  const abs = path.join(ROOT, webp.replace(/^\//, ""));
  return fs.existsSync(abs) ? webp : null;
};

const imgWebp = (src, alt, w, h, loading, extraStyle, extraAttrs) => {
  const webp = webpJikaAda(src);
  const attrs = 'alt="' + esc(alt) + '" width="' + w + '" height="' + h + '"' + (loading ? ' loading="' + loading + '"' : "") + (extraStyle ? ' style="' + extraStyle + '"' : "") + (extraAttrs ? ' ' + extraAttrs : "");
  if (webp) {
    return '<picture><source srcset="' + esc(webp) + '" type="image/webp"><img src="' + esc(src) + '" ' + attrs + ' /></picture>';
  }
  return '<img src="' + esc(src) + '" ' + attrs + ' />';
};

const skripAnalytics = () => {
  const a = (toko && toko.analytics) || {};
  const potongan = [];
  if (a.google) {
    potongan.push(
      `<script async src="https://www.googletagmanager.com/gtag/js?id=${esc(a.google)}"></script>`,
    );
    potongan.push(
      `<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${esc(a.google)}');</script>`,
    );
  }
  if (a.plausibleDomain) {
    potongan.push(
      `<script defer data-domain="${esc(a.plausibleDomain)}" src="https://plausible.io/js/script.js"></script>`,
    );
  }
  if (a.umamiWebsiteId) {
    const src = a.umamiSrc || "https://analytics.umami.is/script.js";
    potongan.push(
      `<script defer src="${esc(src)}" data-website-id="${esc(a.umamiWebsiteId)}"></script>`,
    );
  }
  return potongan.join("\n  ");
};
const tampilHarga = toko.tampilkanHarga === true;
const buka24Jam = toko.buka24Jam === true;

const alamatLengkap =
  [toko.alamat, toko.alamatKota || toko.kota, toko.provinsi]
    .filter(Boolean)
    .join(", ") + (toko.kodePos ? " " + toko.kodePos : "");

const namaInstagram = (() => {
  const cocok = String(toko.instagram || "").match(/instagram\.com\/([^/?#]+)/i);
  return cocok ? "@" + cocok[1].replace(/\/$/, "") : "";
})();

const tautanWa = (pesan) =>
  "https://wa.me/" + nomorWa + "?text=" + encodeURIComponent(pesan || toko.whatsappPesan);

const potongTeks = (teks, maksimal = 157) => {
  const bersih = String(teks).replace(/\s+/g, " ").trim();
  if (bersih.length <= maksimal) return bersih;
  const potong = bersih.slice(0, maksimal);
  return potong.slice(0, potong.lastIndexOf(" ")).replace(/[,.;:]$/, "") + ".";
};

const tanggalHariIni = new Date().toISOString().slice(0, 10);

const ambilJam = (teks, bawaan) => {
  const cocok = String(teks || "").match(/(\d{1,2})[.:](\d{2})\s*[-\u2013]\s*(\d{1,2})[.:](\d{2})/);
  if (!cocok) return bawaan || null;
  const dua = (angka) => String(angka).padStart(2, "0");
  return { opens: dua(cocok[1]) + ":" + cocok[2], closes: dua(cocok[3]) + ":" + cocok[4] };
};

const jamKerja = ambilJam(toko.jam, null);
const jamAkhirPekan = ambilJam(toko.jamMinggu, null) || jamKerja;

/* ----------------------------- Ikon SVG -------------------------------- */

const ikon = (nama, kelas = "") => {
  const isi = {
    bunga:
      '<path d="M12 12c0-2.2 1.8-4 4-4s4 1.8 4 4-1.8 4-4 4-4-1.8-4-4Z"/><path d="M12 12c0 2.2-1.8 4-4 4s-4-1.8-4-4 1.8-4 4-4 4 1.8 4 4Z"/><path d="M12 12c2.2 0 4 1.8 4 4s-1.8 4-4 4-4-1.8-4-4 1.8-4 4-4Z"/><path d="M12 12c-2.2 0-4-1.8-4-4s1.8-4 4-4 4 1.8 4 4-1.8 4-4 4Z"/><circle cx="12" cy="12" r="1.6"/>',
    sparkle:
      '<path d="m12 3 1.8 4.9L18.7 9.7l-4.9 1.8L12 16.4l-1.8-4.9L5.3 9.7l4.9-1.8L12 3Z"/><path d="M18.5 15.5 19.4 18l2.5.9-2.5.9-.9 2.5-.9-2.5-2.5-.9 2.5-.9.9-2.5Z"/>',
    daun:
      '<path d="M4 20c0-7 4.5-13 15-15 0 9-5 15-12 15H4Z"/><path d="M4 20c3-5 6-8 11-10"/>',
    bintang:
      '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1L3.2 9.5l6.1-.9L12 3Z"/>',
    hati:
      '<path d="M20.8 5.6a5.2 5.2 0 0 0-7.4 0L12 7l-1.4-1.4a5.2 5.2 0 1 0-7.4 7.4L12 21l8.8-8a5.2 5.2 0 0 0 0-7.4Z"/>',
    pena:
      '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5Z"/>',
    vas:
      '<path d="M9 3h6l-1 4c2 1.4 3 3.4 3 5.6C17 16.7 14.8 19 12 19s-5-2.3-5-6.4C7 10.4 8 8.4 10 7L9 3Z"/><path d="M9 3h6"/>',
    centang:
      '<path d="m20 6-11 11-5-5"/>',
    panah:
      '<path d="M5 12h14"/><path d="m13 6 6 6-6 6"/>',
    chevron:
      '<path d="m9 18 6-6-6-6"/>',
    telepon:
      '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.9a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.2-1.2a2 2 0 0 1 2.1-.5c.9.3 1.9.6 2.9.7a2 2 0 0 1 1.7 2Z"/>',
    truk:
      '<path d="M14 17H3V6h11v11Z"/><path d="M14 9h4l3 3.5V17h-7V9Z"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>',
    jam:
      '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    perisai:
      '<path d="M12 3 5 6v6c0 4.4 3 7.6 7 9 4-1.4 7-4.6 7-9V6l-7-3Z"/><path d="m9 12 2 2 4-4"/>',
    lokasi:
      '<path d="M20 10c0 5.5-8 12-8 12s-8-6.5-8-12a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
    surel:
      '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
    instagram:
      '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".8" fill="currentColor" stroke="none"/>',
    cari:
      '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    menu:
      '<path d="M4 7h16M4 12h16M4 17h16"/>',
    tutup:
      '<path d="M6 6l12 12M18 6 6 18"/>',
    wa:
      '<path d="M21 11.5A8.4 8.4 0 0 1 8.7 19L4 20l1.1-4.5A8.4 8.4 0 1 1 21 11.5Z"/><path d="M9 8.5c0 3 2.5 5.5 5.5 5.5.6 0 1.2-.5 1.2-1.1l-1.7-.8-.9.9a5.2 5.2 0 0 1-2.1-2.1l.9-.9-.8-1.7c-.6 0-1.1.5-1.1 1.2Z"/>',
    matahari:
      '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    bulan:
      '<path d="M21 12.8A8.5 8.5 0 1 1 11.2 3a6.6 6.6 0 0 0 9.8 9.8Z"/>',
  };
  return `<svg class="${kelas}" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${isi[nama] || isi.bunga}</svg>`;
};

const petaIkonKategori = {
  sparkle: "sparkle",
  leaf: "daun",
  star: "bintang",
  heart: "hati",
  pen: "pena",
  vase: "vas",
  perisai: "perisai",
};

/* ----------------------------- Data turunan ---------------------------- */

produk = produk
  .filter((p) => p && p.nama && p.slug)
  .map((p) => ({
    ...p,
    badge: p.badge || "",
    unggulan: Boolean(p.unggulan),
    tags: Array.isArray(p.tags) ? p.tags : [],
    deskripsi: Array.isArray(p.deskripsi) ? p.deskripsi : [String(p.deskripsi || "")].filter(Boolean),
    termasuk: Array.isArray(p.termasuk) ? p.termasuk : [],
    kategori: p.kategori || "Lainnya",
  }));

const namaKategori = new Set(kategori.map((k) => k.nama));
const kategoriDipakai = new Set(produk.map((p) => p.kategori));
for (const nama of kategoriDipakai) {
  if (!namaKategori.has(nama)) {
    console.warn(`[peringatan] Kategori "${nama}" ada di katalog.json tetapi belum ada di kategori.json.`);
  }
}
for (const p of produk) {
  if (!p.gambar) console.warn(`[peringatan] Produk "${p.nama}" belum punya gambar.`);
}

const produkUnggulan = produk.filter((p) => p.unggulan).slice(0, 6);
if (produkUnggulan.length < 6) {
  for (const p of produk) {
    if (produkUnggulan.length >= 6) break;
    if (!produkUnggulan.includes(p)) produkUnggulan.push(p);
  }
}

const semuaKategori = kategori;

const faq = [
  {
    tanya: "Berapa lama pengerjaan papan bunga?",
    jawab:
      "Sebagian besar papan bunga siap dalam 1 hari kerja. Pesanan diterima setiap hari, 24 jam. Jam buka toko fisik dapat berbeda; hubungi WhatsApp untuk jadwal kunjungan. Untuk kebutuhan mendesak, hubungi WhatsApp kami agar jadwal pengiriman bisa segera dikonfirmasi.",
  },
  {
    tanya: "Apakah bisa kirim di hari yang sama?",
    jawab:
      "Bisa untuk area Padang Panjang dan sekitarnya selama bahan bunga tersedia dan pesanan sudah dikonfirmasi. Ketersediaan pengiriman hari yang sama akan kami konfirmasi saat Anda menghubungi WhatsApp.",
  },
  {
    tanya: "Apakah bunga yang dipakai asli atau artificial?",
    jawab:
      "Kami menggunakan bunga artificial premium, sehingga warna dan bentuknya konsisten, rapi, dan tahan lama. Palet warna dapat disesuaikan dengan tema acara atau identitas brand Anda.",
  },
  {
    tanya: "Bagaimana cara memesan?",
    jawab:
      "Pilih produk di katalog, lalu klik tombol Pesan via WhatsApp. Sertakan nama produk, tulisan yang diinginkan, alamat pengiriman, dan tanggal acara. Tim kami akan mengonfirmasi ketersediaan serta total biaya.",
  },
  {
    tanya: "Bagaimana cara mengetahui harga?",
    jawab:
      "Harga menyesuaikan desain, ukuran, dan lokasi pengiriman. Kirim detail acara Anda melalui WhatsApp, kami akan mengirimkan penawaran lengkap sebelum pesanan dikonfirmasi.",
  },
  {
    tanya: "Metode pembayaran apa yang tersedia?",
    jawab:
      "Kami menerima transfer bank dan pembayaran QRIS. Untuk pesanan perusahaan, kami dapat menerbitkan invoice sesuai kebutuhan administrasi.",
  },
];

/* ----------------------------- Komponen -------------------------------- */

const tautanNav = (jalur, label, aktif) =>
  `<a href="${jalur}"${aktif ? ' aria-current="page"' : ""}>${esc(label)}</a>`;

const header = (aktif) => `
  <header class="site-header">
    <div class="container header-inner">
      <a class="brand" href="/" aria-label="${esc(toko.nama)} - beranda">
${logoToko ? `<img class="brand-logo" src="${esc(logoToko)}" alt="${esc(toko.nama)}" width="40" height="40" />` : `<span class="brand-mark">${ikon("bunga")}</span>`}
        <span>
          <span class="brand-name">${esc(toko.nama)}</span>
          <span class="brand-sub">Papan Bunga &middot; ${esc(toko.kota)}</span>
        </span>
      </a>
      <nav class="site-nav" id="navigasi" aria-label="Navigasi utama">
        ${tautanNav("/", "Beranda", aktif === "beranda")}
        ${tautanNav("/katalog/", "Katalog", aktif === "katalog")}
        ${tautanNav("/galeri/", "Galeri", aktif === "galeri")}
        ${tautanNav("/#tentang", "Tentang", false)}
        ${tautanNav("/#kontak", "Kontak", false)}
      </nav>
      <div class="header-actions">
        <a class="btn btn-primary btn-sm header-cta" href="${tautanWa()}" target="_blank" rel="noopener">
          ${ikon("wa")} WhatsApp
        </a>
        <button class="tema-toggle" type="button" data-tema-toggle aria-label="Ganti mode terang atau gelap" title="Mode terang / gelap">
          <span class="tema-ikon tema-matahari">${ikon("matahari")}</span>
          <span class="tema-ikon tema-bulan">${ikon("bulan")}</span>
        </button>
        <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="navigasi" aria-label="Buka menu">
          <span class="nav-toggle-buka">${ikon("menu")}</span>
          <span class="nav-toggle-tutup" hidden>${ikon("tutup")}</span>
        </button>
      </div>
    </div>
  </header>`;

const footer = () => `
  <footer class="site-footer" id="kontak">
    <div class="container">
      <div class="footer-grid">
        <div class="footer-about">
          <a class="brand" href="/">
            ${logoToko ? `<img class="brand-logo" src="${esc(logoToko)}" alt="${esc(toko.nama)}" width="40" height="40" />` : `<span class="brand-mark">${ikon("bunga")}</span>`}
            <span>
              <span class="brand-name">${esc(toko.nama)}</span>
              <span class="brand-sub">Papan Bunga &middot; ${esc(toko.kota)}</span>
            </span>
          </a>
          <p>${esc(toko.deskripsi)}</p>
        </div>

        <div>
          <h2 class="footer-title">Halaman</h2>
          <ul class="footer-links">
            <li><a href="/">Beranda</a></li>
            <li><a href="/katalog/">Katalog papan bunga</a></li>
            <li><a href="/galeri/">Galeri orderan</a></li>
            ${areaDipakai
              .map((a) => `<li><a href="/area/${slugArea(a)}/">Papan bunga ${esc(a)}</a></li>`)
              .join("")}
            <li><a href="/#tentang">Tentang kami</a></li>
            <li><a href="/#faq">Pertanyaan umum</a></li>
          </ul>
        </div>

        <div>
          <h2 class="footer-title">Kategori</h2>
          <ul class="footer-links">
            ${semuaKategori
              .map((k) => `<li><a href="/katalog/${esc(k.slug)}/">${esc(k.nama)}</a></li>`)
              .join("")}
          </ul>
        </div>

        <div>
          <h2 class="footer-title">Hubungi kami</h2>
          <ul class="footer-contact">
            <li>${ikon("lokasi")}<span>${esc(alamatLengkap)}${
              toko.mapsUrl
                ? `<br /><a href="${esc(toko.mapsUrl)}" target="_blank" rel="noopener">Lihat di Google Maps</a>`
                : ""
            }</span></li>
            <li>${ikon("telepon")}<a href="${tautanWa()}" target="_blank" rel="noopener">+${esc(nomorWa)}</a></li>
            ${toko.email ? `<li>${ikon("surel")}<a href="mailto:${esc(toko.email)}">${esc(toko.email)}</a></li>` : ""}
            ${
              toko.instagram
                ? `<li>${ikon("instagram")}<a href="${esc(toko.instagram)}" target="_blank" rel="noopener">${esc(namaInstagram || "Instagram")}</a></li>`
                : ""
            }
            <li>${ikon("jam")}<span>${esc(toko.jam)}${toko.jamMinggu ? `<br />${esc(toko.jamMinggu)}` : ""}</span></li>
          </ul>
        </div>
      </div>

      <div class="footer-bottom">
        <span>&copy; ${new Date().getFullYear()} ${esc(toko.nama)}. Seluruh hak cipta dilindungi.</span>
        <span>Papan bunga untuk ${esc(toko.kota)} dan sekitarnya.</span>
      </div>
    </div>
  </footer>`;

const tombolWaMengambang = () => `
  <a class="wa-float" href="${tautanWa()}" target="_blank" rel="noopener" aria-label="Hubungi kami via WhatsApp">
    ${ikon("wa")}<span>Pesan via WhatsApp</span>
  </a>`;

const layout = ({
  judul,
  deskripsi,
  jalur,
  isi,
  aktif = "",
  gambarOg = "/gambar/og-default.jpg",
  lebarOg = 1200,
  tinggiOg = 630,
  tipeOg = "website",
  skema = [],
  noindex = false,
}) => {
  const kanonik = alamatAbsolut(jalur);
  return `<!doctype html>
<html lang="id" class="no-js" data-theme="light">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <script>
    (function () {
      try {
        var tersimpan = localStorage.getItem("akio-tema");
        var manualTanggal = localStorage.getItem("akio-tema-manual");
        var hariIni = new Date().toDateString();
        var tema;
        if ((tersimpan === "light" || tersimpan === "dark") && manualTanggal === hariIni) {
          tema = tersimpan;
        } else {
          var jam = new Date().getHours();
          tema = (jam >= 6 && jam < 18) ? "light" : "dark";
          try { localStorage.removeItem("akio-tema"); localStorage.removeItem("akio-tema-manual"); } catch (e) {}
        }
        document.documentElement.setAttribute("data-theme", tema);
      } catch (e) {}
    })();
  </script>
  <title>${esc(judul)}</title>
  <meta name="description" content="${esc(deskripsi)}" />
  <link rel="canonical" href="${kanonik}" />
  <meta name="robots" content="${noindex ? "noindex, follow" : "index, follow, max-image-preview:large"}" />
  <meta name="theme-color" content="#0b4f45" id="meta-tema" />
  <meta name="geo.region" content="ID" />
  <meta name="geo.placename" content="${esc(toko.kota)}" />
  ${toko.googleVerification ? `<meta name="google-site-verification" content="${esc(toko.googleVerification)}" />` : ""}

  <meta property="og:locale" content="id_ID" />
  <meta property="og:type" content="${tipeOg}" />
  <meta property="og:site_name" content="${esc(toko.nama)}" />
  <meta property="og:title" content="${esc(judul)}" />
  <meta property="og:description" content="${esc(deskripsi)}" />
  <meta property="og:url" content="${kanonik}" />
  <meta property="og:image" content="${alamatAbsolut(gambarOg)}" />
  <meta property="og:image:width" content="${lebarOg}" />
  <meta property="og:image:height" content="${tinggiOg}" />
  <meta property="og:image:alt" content="${esc(toko.nama)} - ${esc(toko.kota)}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${esc(judul)}" />
  <meta name="twitter:description" content="${esc(deskripsi)}" />
  <meta name="twitter:image" content="${alamatAbsolut(gambarOg)}" />

  <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
  <link rel="stylesheet" href="${CSS_URL}" />
  <script>document.documentElement.classList.remove("no-js");document.documentElement.classList.add("js");</script>
  ${skema
    .map(
      (item) =>
        `<script type="application/ld+json">${JSON.stringify(item).replace(/</g, "\\u003c")}</script>`,
    )
    .join("\n  ")}
  ${skripAnalytics()}
</head>
<body>
  <a class="skip-link" href="#konten">Lewati ke konten</a>
  ${header(aktif)}
  <main id="konten">
${isi}
  </main>
  ${footer()}
  ${tombolWaMengambang()}
  <div class="quickview" id="quickview" aria-hidden="true" role="dialog" aria-modal="true" data-wa="${nomorWa}">
    <div class="quickview-backdrop" data-qv-close></div>
    <div class="quickview-panel">
      <button class="quickview-close" type="button" data-qv-close aria-label="Tutup">×</button>
      <h2 id="qv-nama">Pesan Cepat</h2>
      <p class="qv-sub">Isi detail pesanan, kami kirim ke WhatsApp untuk konfirmasi harga &amp; jadwal.</p>
      <form id="qv-form">
        <label>Nama pemesan<input type="text" name="nama" required placeholder="Nama Anda" /></label>
        <label>Nomor WhatsApp<input type="tel" name="wa" required placeholder="08xxxxxxxxxx" /></label>
        <label>Teks di papan bunga<textarea name="teks" rows="3" required placeholder="Contoh: Selamat &amp; Sukses - Budi Santoso"></textarea></label>
        <label>Tanggal acara<input type="date" name="tanggal" /></label>
        <label>Catatan (opsional)<textarea name="catatan" rows="2" placeholder="Warna, ukuran, alamat pengiriman, dll."></textarea></label>
        <button class="btn btn-primary" type="submit">${ikon("wa")} Kirim ke WhatsApp</button>
      </form>
    </div>
  </div>
  <script src="${JS_URL}" defer></script>
</body>
</html>
`;
};

const kartuProduk = (p) => `
  <article class="produk-card reveal">
    <div class="produk-media">
      ${imgWebp(p.gambar, p.alt || p.nama, "1200", "900", "lazy", "object-position: " + (p.fokusGambar || "center") + ";")}
      ${p.badge ? `<span class="badge${p.badge === "Terlaris" || p.badge === "Premium" ? " badge-gold" : ""}">${esc(p.badge)}</span>` : ""}
    </div>
    <div class="produk-body">
      <span class="produk-kategori">${esc(p.kategori)}</span>
      <h3><a href="/produk/${esc(p.slug)}/">${esc(p.nama)}</a></h3>
      <div class="produk-foot">
        <span class="produk-harga">${
          tampilHarga
            ? `${rupiah(p.harga)} <small>${esc(p.satuan || "per papan")}</small>`
            : "Harga sesuai desain"
        }</span>
        <div class="produk-aksi">
          <button class="btn btn-sm btn-quickview" type="button" data-slug="${esc(p.slug)}" data-nama="${esc(p.nama)}">Pesan cepat</button>
          <span class="produk-more">Detail ${ikon("panah")}</span>
        </div>
      </div>
    </div>
  </article>`;

const kartuKategori = (k) => `
  <a class="kategori-card reveal" href="/katalog/${esc(k.slug)}/">
    <span class="kategori-icon">${ikon(petaIkonKategori[k.ikon] || "bunga")}</span>
    ${imgWebp(k.gambar, k.nama, "1200", "900", "lazy", "object-position: " + (k.fokusGambar || "center") + ";")}
    <div class="kategori-body">
      <h3>${esc(k.nama)}</h3>
      <p>${esc(k.deskripsi)}</p>
    </div>
  </a>`;

/* ----------------------------- Skema SEO ------------------------------- */

const skemaToko = {
  "@context": "https://schema.org",
  "@type": "Florist",
  "@id": alamatAbsolut("/#toko"),
  name: toko.nama,
  description: toko.deskripsi,
  url: alamatAbsolut("/"),
  image: alamatAbsolut(logoToko || "/gambar/og-default.jpg"),
  logo: alamatAbsolut("/favicon.svg"),
  telephone: "+" + nomorWa,
  ...(toko.email ? { email: toko.email } : {}),
  ...(tampilHarga
    ? {
        priceRange:
          rupiah(toko.hargaMulai) +
          " - " +
          rupiah(Math.max(...produk.map((p) => Number(p.harga) || 0))),
      }
    : {}),
  currenciesAccepted: "IDR",
  paymentAccepted: "Transfer bank, QRIS, Tunai",
  address: {
    "@type": "PostalAddress",
    ...(toko.alamat ? { streetAddress: toko.alamat } : {}),
    addressLocality: toko.alamatKota || toko.kota,
    addressRegion: toko.provinsi,
    ...(toko.kodePos ? { postalCode: toko.kodePos } : {}),
    addressCountry: "ID",
  },
  areaServed: (toko.area || []).map((nama) => ({ "@type": "City", name: nama })),
  ...(testimoni.length
    ? {
        aggregateRating: {
          "@type": "AggregateRating",
          ratingValue: (
            testimoni.reduce((a, t) => a + (Number(t.rating) || 5), 0) / testimoni.length
          ).toFixed(1),
          reviewCount: testimoni.length,
          bestRating: 5,
          worstRating: 1,
        },
      }
    : {}),
  ...(buka24Jam
    ? {
        openingHoursSpecification: [
          {
            "@type": "OpeningHoursSpecification",
            dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
            opens: "00:00",
            closes: "23:59",
          },
        ],
      }
    : jamKerja
      ? {
          openingHoursSpecification: [
            {
              "@type": "OpeningHoursSpecification",
              dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
              opens: jamKerja.opens,
              closes: jamKerja.closes,
            },
            ...(jamAkhirPekan && jamAkhirPekan !== jamKerja
              ? [
                  {
                    "@type": "OpeningHoursSpecification",
                    dayOfWeek: "Sunday",
                    opens: jamAkhirPekan.opens,
                    closes: jamAkhirPekan.closes,
                  },
                ]
              : []),
          ],
        }
      : {}),
  sameAs: [toko.instagram].filter(Boolean),
  ...(toko.mapsUrl ? { hasMap: toko.mapsUrl } : {}),
  hasOfferCatalog: {
    "@type": "OfferCatalog",
    name: "Katalog papan bunga",
    itemListElement: produk.map((p) => ({
      "@type": "Offer",
      itemOffered: { "@type": "Product", name: p.nama, url: alamatAbsolut(`/produk/${p.slug}/`) },
      ...(tampilHarga ? { price: Number(p.harga), priceCurrency: "IDR" } : {}),
    })),
  },
};

const skemaFaq = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faq.map((f) => ({
    "@type": "Question",
    name: f.tanya,
    acceptedAnswer: { "@type": "Answer", text: f.jawab },
  })),
};

const skemaRemah = (daftar) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: daftar.map((item, i) => ({
    "@type": "ListItem",
    position: i + 1,
    name: item.nama,
    item: alamatAbsolut(item.jalur),
  })),
});

/* ----------------------------- Halaman beranda ------------------------- */

const beranda = () => {
  const jumlahKategori = semuaKategori.length;
  const isi = `
    <section class="hero">
      <div class="container hero-grid">
        <div>
          <span class="eyebrow">Papan Bunga &middot; ${esc(toko.kota)}</span>
          <h1>${esc(toko.heroJudul)}</h1>
          <p class="lead">${esc(toko.heroTeks)}</p>
          <div class="hero-actions">
            <a class="btn btn-primary" href="/katalog/">Lihat katalog ${ikon("panah")}</a>
            <a class="btn btn-outline" href="${tautanWa()}" target="_blank" rel="noopener">${ikon("wa")} Pesan via WhatsApp</a>
          </div>
          <ul class="hero-trust">
            <li>${ikon("truk")} Pengiriman area ${esc(toko.kota)}</li>
            <li>${ikon("pena")} Tulisan &amp; warna custom</li>
            <li>${ikon("daun")} Bunga artificial premium</li>
            <li>${ikon("jam")} Pesanan diterima 24 jam</li>
          </ul>
        </div>
        <div class="hero-media">
          ${imgWebp("/gambar/hero.jpg", "Papan bunga elegan rangkaian " + toko.nama, "1200", "1050", null, null, 'fetchpriority="high"')}
          <span class="hero-badge">Custom Design</span>
          <div class="hero-card">
            ${
              tampilHarga
                ? `<span>Mulai dari</span>
            <strong>${rupiahSingkat(toko.hargaMulai)}</strong>
            <small>Termasuk konsultasi desain</small>`
                : `<span>Konsultasi desain</span>
            <strong>Gratis</strong>
            <small>Lewat WhatsApp, kapan saja</small>`
            }
          </div>
        </div>
      </div>
    </section>

    <section class="section" id="kategori">
      <div class="container">
        <div class="section-head">
          <span class="eyebrow">Kategori</span>
          <h2>Pilih tipe papan bunga</h2>
          <p>Standard, double, mahkota 2 titik, premium, dan exclusive. Setiap desain dapat disesuaikan tulisan dan warnanya.</p>
        </div>
        <div class="kategori-grid">
          ${semuaKategori.map(kartuKategori).join("")}
        </div>
      </div>
    </section>

    <section class="section section-cream" id="unggulan">
      <div class="container">
        <div class="section-head left" style="display:flex;align-items:flex-end;justify-content:space-between;gap:24px;flex-wrap:wrap;max-width:none;">
          <div style="max-width:560px;">
            <span class="eyebrow">Paling dipesan</span>
            <h2>Papan bunga unggulan</h2>
            <p>Desain yang paling sering dipilih pelanggan, siap dipesan dengan penyesuaian tulisan dan warna.</p>
          </div>
          <a class="btn btn-outline" href="/katalog/">Lihat semua ${ikon("panah")}</a>
        </div>
        <div class="produk-grid">
          ${produkUnggulan.map(kartuProduk).join("")}
        </div>
      </div>
    </section>

    <section class="section">
      <div class="container">
        <div class="section-head">
          <span class="eyebrow">Mengapa kami</span>
          <h2>Dibuat rapi, dikirim tepat waktu</h2>
          <p>Kami menjaga kualitas dari pemilihan bunga hingga saat papan bunga tiba di lokasi acara.</p>
        </div>
        <div class="fitur-grid">
          <div class="fitur-item reveal">
            <span class="fitur-icon">${ikon("truk")}</span>
            <h3>Pengiriman terjadwal</h3>
            <p>Antar sesuai waktu acara untuk area Padang Panjang, Batipuh, X Koto, dan sekitarnya.</p>
          </div>
          <div class="fitur-item reveal">
            <span class="fitur-icon">${ikon("pena")}</span>
            <h3>Tulisan custom</h3>
            <p>Nama, ucapan, dan warna rangkaian dapat disesuaikan dengan acara atau identitas brand Anda.</p>
          </div>
          <div class="fitur-item reveal">
            <span class="fitur-icon">${ikon("daun")}</span>
            <h3>Bunga artificial premium</h3>
            <p>Rangkaian bunga artificial pilihan agar tampilan tetap cantik, konsisten, dan tahan lama.</p>
          </div>
          <div class="fitur-item reveal">
            <span class="fitur-icon">${ikon("perisai")}</span>
            <h3>Penawaran jelas</h3>
            <p>Rincian biaya disampaikan saat konsultasi, sebelum pesanan dikonfirmasi.</p>
          </div>
        </div>
      </div>
    </section>

    <section class="section section-cream" id="tentang">
      <div class="container tentang-grid">
        <div class="tentang-media reveal">
          ${imgWebp("/gambar/papan-bunga-grand-opening.jpg", "Papan bunga grand opening buatan " + toko.nama, "1200", "900", "lazy", null)}
          <div class="tentang-note">
            <strong>${jumlahKategori} kategori</strong>
            ${produk.length} pilihan papan bunga siap dipesan
          </div>
        </div>
        <div class="tentang-teks">
          <span class="eyebrow">Tentang kami</span>
          <h2>Florist yang memahami detail acara Anda</h2>
          <p>${esc(toko.deskripsi)}</p>
          <p>Setiap pesanan ditangani langsung oleh tim kami, mulai dari konsultasi desain, pemilihan bunga, hingga pengiriman ke lokasi. Kami terbiasa melayani kebutuhan pribadi, perusahaan, dan acara resmi.</p>
          <ul class="tentang-list">
            <li>${ikon("centang")} Konsultasi desain sebelum produksi</li>
            <li>${ikon("centang")} Bisa melayani pesanan dalam jumlah banyak</li>
            <li>${ikon("centang")} Invoice tersedia untuk kebutuhan perusahaan</li>
            <li>${ikon("centang")} Pengiriman terjadwal sesuai waktu acara</li>
          </ul>
          <div class="area-wrap">
            ${(toko.area || [])
              .map(
                (nama) =>
                  `<a class="area-chip" href="/area/${slugArea(nama)}/">${ikon("lokasi")} ${esc(nama)}</a>`,
              )
              .join("")}
          </div>
        </div>
      </div>
    </section>

    ${
      testimoni.length
        ? `
    <section class="section section-cream" id="testimoni">
      <div class="container">
        <div class="section-head">
          <span class="eyebrow">Kata pelanggan</span>
          <h2>Dipercaya untuk momen penting</h2>
          <p>Beberapa cerita dari pelanggan yang sudah memesan papan bunga di AKIO FLORIST.</p>
        </div>
        <div class="testimoni-grid">
          ${testimoni
            .map(
              (t) => `
          <article class="testimoni-card reveal">
            <div class="testimoni-bintang" aria-label="${esc(String(t.rating || 5))} dari 5 bintang">${"★".repeat(Math.max(1, Math.min(5, Number(t.rating) || 5)))}</div>
            <p class="testimoni-teks">“${esc(t.teks || "")}”</p>
            <div class="testimoni-meta">
              <strong>${esc(t.nama || "Pelanggan")}</strong>
              <span>${esc(t.acara || "")}${t.kota ? " · " + esc(t.kota) : ""}</span>
            </div>
          </article>`,
            )
            .join("")}
        </div>
      </div>
    </section>`
        : ""
    }

    <section class="section">
      <div class="container">
        <div class="section-head">
          <span class="eyebrow">Cara pesan</span>
          <h2>Tiga langkah, pesanan siap diantar</h2>
          <p>Tanpa formulir panjang. Cukup pilih desain, konsultasikan detailnya, lalu kami yang urus sisanya.</p>
        </div>
        <div class="proses-grid">
          <div class="proses-item reveal">
            <h3>Pilih papan bunga</h3>
            <p>Lihat katalog dan tentukan model yang paling sesuai dengan acara Anda.</p>
          </div>
          <div class="proses-item reveal">
            <h3>Konfirmasi detail</h3>
            <p>Kirim tulisan, alamat, dan tanggal lewat WhatsApp. Kami cek stok dan biaya pengiriman.</p>
          </div>
          <div class="proses-item reveal">
            <h3>Kami antar</h3>
            <p>Papan bunga dirangkai, difoto sebelum dikirim, lalu diantar sesuai jadwal.</p>
          </div>
        </div>
      </div>
    </section>

    <section class="section section-cream" id="faq">
      <div class="container">
        <div class="section-head">
          <span class="eyebrow">FAQ</span>
          <h2>Pertanyaan yang sering diajukan</h2>
          <p>Belum menemukan jawabannya? Hubungi kami lewat WhatsApp, kami siap membantu.</p>
        </div>
        <div class="faq-list">
          ${faq
            .map(
              (f) => `
          <details class="faq-item">
            <summary>${esc(f.tanya)}</summary>
            <div class="faq-answer"><p>${esc(f.jawab)}</p></div>
          </details>`,
            )
            .join("")}
        </div>
      </div>
    </section>

    <section class="cta-band">
      <div class="container cta-inner">
        <div>
          <h2>Siap memesan papan bunga?</h2>
          <p>Konsultasikan kebutuhan Anda sekarang. Kami bantu pilih desain, warna, dan waktu pengiriman yang tepat.</p>
        </div>
        <div class="cta-actions">
          <a class="btn btn-gold" href="/katalog/">Lihat katalog</a>
          <a class="btn btn-outline" href="/#faq">Baca pertanyaan umum</a>
        </div>
      </div>
    </section>`;

  return layout({
    judul: `Papan Bunga ${toko.kota} | ${toko.nama} - Standard, Double, Premium & Exclusive`,
    deskripsi: potongTeks(toko.deskripsi),
    jalur: "/",
    isi,
    aktif: "beranda",
    gambarOg: logoToko || "/gambar/og-default.jpg",
    skema: [skemaToko, skemaFaq],
  });
};

/* ----------------------------- Halaman katalog ------------------------- */

const halamanKatalog = () => {
  const isi = `
    <section class="page-hero">
      <div class="container">
        <nav class="breadcrumb" aria-label="Breadcrumb">
          <a href="/">Beranda</a> ${ikon("chevron")} <span>Katalog</span>
        </nav>
        <span class="eyebrow">Katalog</span>
        <h1>Papan bunga untuk setiap acara</h1>
        <p>${produk.length} pilihan papan bunga untuk ucapan selamat, duka cita, grand opening, pernikahan, wisuda, serta pesanan custom. Konsultasikan kebutuhan Anda lewat WhatsApp.</p>
      </div>
    </section>

    <section class="section-tight">
      <div class="container">
        <div class="katalog-toolbar">
          <div class="search-box">
            ${ikon("cari")}
            <label class="sr-only" for="cari-produk">Cari papan bunga</label>
            <input id="cari-produk" type="search" placeholder="Cari papan bunga..." autocomplete="off" />
          </div>
        </div>

        <p class="result-info" id="info-hasil">Menampilkan ${produk.length} produk</p>

        <div class="produk-grid" id="daftar-produk">
          ${produk
            .map(
              (p) => `
          <div class="produk-item" data-kategori="${esc(kategori.find((k) => k.nama === p.kategori)?.slug || "")}" data-cari="${esc(
                [p.nama, p.kategori, p.ringkas, ...(p.tags || [])].join(" ").toLowerCase(),
              )}">
            ${kartuProduk(p)}
          </div>`,
            )
            .join("")}
        </div>

        <div class="empty-state" id="kosong">
          <strong>Belum ada yang cocok</strong>
          Coba kata kunci lain atau pilih kategori “Semua”.
        </div>
      </div>
    </section>

    <section class="cta-band">
      <div class="container cta-inner">
        <div>
          <h2>Tidak menemukan desain yang diinginkan?</h2>
          <p>Kami menerima pesanan custom: bentuk hati, nama besar, warna sesuai brand, hingga ukuran khusus.</p>
        </div>
        <div class="cta-actions">
          <a class="btn btn-gold" href="/katalog/?kategori=custom">Lihat pilihan custom</a>
        </div>
      </div>
    </section>`;

  return layout({
    judul: `Katalog Papan Bunga ${toko.kota} | ${toko.nama}`,
    deskripsi: potongTeks(
      `Katalog papan bunga ${toko.nama} di ${toko.kota}. Pilihan papan bunga ucapan selamat, duka cita, grand opening, pernikahan, wisuda, dan custom. Pesan via WhatsApp kapan saja.`,
    ),
    jalur: "/katalog/",
    isi,
    aktif: "katalog",
    skema: [
      skemaRemah([
        { nama: "Beranda", jalur: "/" },
        { nama: "Katalog", jalur: "/katalog/" },
      ]),
      {
        "@context": "https://schema.org",
        "@type": "ItemList",
        name: "Katalog papan bunga " + toko.nama,
        numberOfItems: produk.length,
        itemListElement: produk.map((p, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: p.nama,
          url: alamatAbsolut(`/produk/${p.slug}/`),
        })),
      },
    ],
  });
};

const halamanKategori = (k) => {
  const slug = k.slug;
  const produkKategori = produk.filter((p) => p.kategori === k.nama);
  const isi = `
    <section class="page-hero">
      <div class="container">
        <nav class="breadcrumb" aria-label="Breadcrumb">
          <a href="/">Beranda</a> ${ikon("chevron")}
          <a href="/katalog/">Katalog</a> ${ikon("chevron")}
          <span>${esc(k.nama)}</span>
        </nav>
        <span class="eyebrow">Koleksi</span>
        <h1>Papan bunga ${esc(k.nama)}</h1>
        <p>${esc(k.deskripsi || "")} ${produkKategori.length} pilihan desain siap dipesan, tulisan dan warna dapat disesuaikan.</p>
      </div>
    </section>

    <section class="section-tight">
      <div class="container">
        <div class="katalog-toolbar">
          <div class="filter-chips" role="group" aria-label="Koleksi lainnya">
            <a class="chip" href="/katalog/">Semua</a>
            ${semuaKategori
              .map(
                (kk) =>
                  `<a class="chip${kk.slug === slug ? ' chip-aktif' : ''}" href="/katalog/${esc(kk.slug)}/">${esc(kk.nama)}</a>`,
              )
              .join("")}
          </div>
        </div>

        <p class="result-info">Menampilkan ${produkKategori.length} produk</p>

        <div class="produk-grid">
          ${produkKategori.map(kartuProduk).join("")}
        </div>

        ${
          produkKategori.length === 0
            ? `<div class="empty-state" style="display:block;">Belum ada produk di kategori ini.</div>`
            : ""
        }
      </div>
    </section>

    <section class="cta-band">
      <div class="container cta-inner">
        <div>
          <h2>Butuh desain khusus untuk ${esc(k.nama)}?</h2>
          <p>Konsultasikan warna, ukuran, dan tulisan. Kami bantu rekomendasikan yang paling sesuai.</p>
        </div>
        <div class="cta-actions">
          <a class="btn btn-gold" href="${tautanWa("Halo " + toko.nama + ", saya ingin pesan papan bunga kategori " + k.nama + ".")}" target="_blank" rel="noopener">${ikon("wa")} Chat WhatsApp</a>
          <a class="btn btn-outline" href="/katalog/">Semua katalog</a>
        </div>
      </div>
    </section>`;
  return layout({
    judul: `Papan Bunga ${k.nama} ${toko.kota} | ${toko.nama}`,
    deskripsi: potongTeks(
      `${k.nama}: ${k.deskripsi || ""} ${produkKategori.length} pilihan papan bunga di ${toko.kota}. Pesan via WhatsApp, pengiriman terjadwal.`,
    ),
    jalur: `/katalog/${slug}/`,
    isi,
    aktif: "katalog",
    skema: [
      skemaRemah([
        { nama: "Beranda", jalur: "/" },
        { nama: "Katalog", jalur: "/katalog/" },
        { nama: k.nama, jalur: `/katalog/${slug}/` },
      ]),
      {
        "@context": "https://schema.org",
        "@type": "ItemList",
        name: `Papan bunga ${k.nama} ${toko.nama}`,
        numberOfItems: produkKategori.length,
        itemListElement: produkKategori.map((p, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: p.nama,
          url: alamatAbsolut(`/produk/${p.slug}/`),
        })),
      },
    ],
  });
};

/* ----------------------------- Halaman galeri -------------------------- */

const halamanGaleri = () => {
  const semuaGambar = galeri.flatMap((g) =>
    g.gambar.map((src) => ({ src, judul: g.judul, tanggal: g.tanggal, tags: g.tags })),
  );

  const isi = `
    <section class="page-hero">
      <div class="container">
        <nav class="breadcrumb" aria-label="Breadcrumb">
          <a href="/">Beranda</a> ${ikon("chevron")}
          <span>Galeri</span>
        </nav>
        <span class="eyebrow">Galeri Orderan</span>
        <h1>Galeri papan bunga yang pernah kami buat</h1>
        <p>Kumpulan foto orderan papan bunga asli dari ${esc(toko.nama)}. Klik foto untuk memperbesar.</p>
      </div>
    </section>

    <section class="section-tight">
      <div class="container">
        ${
          semuaGambar.length === 0
            ? `<div class="empty-state" style="display:block;">Belum ada foto di galeri. Tambahkan via CMS (menu Galeri Orderan).</div>`
            : `<div class="galeri-grid">
                ${semuaGambar
                  .map(
                    (item, i) => `
                  <figure class="galeri-item reveal" data-lightbox="${i}">
                    ${imgWebp(item.src, item.judul, "600", "600", "lazy", "object-fit: cover;")}
                    <figcaption>${esc(item.judul)}${item.tanggal ? ` · ${esc(item.tanggal)}` : ""}</figcaption>
                  </figure>`,
                  )
                  .join("")}
              </div>`
        }
      </div>
    </section>

    <div class="lightbox" id="lightbox" aria-hidden="true" role="dialog" aria-modal="true">
      <div class="lightbox-backdrop" data-lb-close></div>
      <button class="lightbox-close" type="button" data-lb-close aria-label="Tutup">×</button>
      <button class="lightbox-prev" type="button" data-lb-prev aria-label="Sebelumnya">‹</button>
      <button class="lightbox-next" type="button" data-lb-next aria-label="Berikutnya">›</button>
      <figure class="lightbox-figure">
        <img id="lb-img" src="" alt="" />
        <figcaption id="lb-caption"></figcaption>
      </figure>
    </div>

    <script>
      window.GALERI = ${JSON.stringify(semuaGambar.map((i) => ({ src: i.src, judul: i.judul })))};
    </script>`;

  return layout({
    judul: `Galeri Papan Bunga ${toko.kota} | ${toko.nama}`,
    deskripsi: potongTeks(
      `Galeri foto orderan papan bunga asli dari ${toko.nama} di ${toko.kota}. Berbagai desain ucapan, duka cita, grand opening, dan custom.`,
    ),
    jalur: "/galeri/",
    isi,
    aktif: "galeri",
    skema: [
      skemaRemah([
        { nama: "Beranda", jalur: "/" },
        { nama: "Galeri", jalur: "/galeri/" },
      ]),
    ],
  });
};

/* ----------------------------- Halaman produk -------------------------- */

const halamanProduk = (p) => {
  const indeks = produk.indexOf(p);
  const terkait = produk
    .filter((lain) => lain.slug !== p.slug)
    .sort((a, b) => {
      const aSama = a.kategori === p.kategori ? 0 : 1;
      const bSama = b.kategori === p.kategori ? 0 : 1;
      return aSama - bSama;
    })
    .slice(0, 3);

  const pesanWa =
    `Halo ${toko.nama}, saya ingin memesan ${p.nama}. ` + `Berikut detail acara saya: `;

  const isi = `
    <section class="produk-hero">
      <div class="container">
        <nav class="breadcrumb" aria-label="Breadcrumb">
          <a href="/">Beranda</a> ${ikon("chevron")}
          <a href="/katalog/">Katalog</a> ${ikon("chevron")}
          <span>${esc(p.nama)}</span>
        </nav>

        <div class="produk-detail">
          <div class="produk-foto reveal">
            ${imgWebp(p.gambar, p.alt || p.nama, "1200", "900", null, null, 'fetchpriority="high"')}
            ${p.badge ? `<span class="badge badge-gold">${esc(p.badge)}</span>` : ""}
          </div>

          <div class="produk-info">
            <span class="produk-kategori">${esc(p.kategori)}</span>
            <h1>${esc(p.nama)}</h1>
            <p class="ringkas">${esc(p.ringkas || "")}</p>

            <div class="harga-box">
              <div>
                <span class="harga-label">Harga</span>
                <span class="harga-nilai">${
                  tampilHarga
                    ? `${rupiah(p.harga)} <small>${esc(p.satuan || "per papan")}</small>`
                    : "Sesuai desain"
                }</span>
              </div>
              <span class="note">${
                tampilHarga
                  ? "Belum termasuk ongkir, dikonfirmasi saat pemesanan"
                  : "Hubungi WhatsApp untuk penawaran dan ketersediaan"
              }</span>
            </div>

            <div class="produk-cta">
              <a class="btn btn-primary btn-block" href="${tautanWa(pesanWa)}" target="_blank" rel="noopener">
                ${ikon("wa")} Pesan via WhatsApp
              </a>
              <a class="btn btn-outline btn-block" href="tel:+${esc(nomorWa)}">${ikon("telepon")} Telepon kami</a>
            </div>

            <dl class="spesifikasi">
              <div><dt>Ukuran</dt><dd>${esc(p.ukuran || "-")}</dd></div>
              <div><dt>Bahan</dt><dd>${esc(p.bahan || "-")}</dd></div>
              <div><dt>Pengerjaan</dt><dd>${esc(p.pengerjaan || "-")}</dd></div>
              <div><dt>Pengiriman</dt><dd>${esc(toko.pengiriman)}</dd></div>
              <div><dt>Area</dt><dd>${esc((toko.area || []).slice(0, 3).join(", "))} &amp; sekitarnya</dd></div>
            </dl>
          </div>
        </div>

        <div class="produk-isi">
          <div class="prose">
            <h2>Tentang ${esc(p.nama)}</h2>
            ${p.deskripsi.map((paragraf) => `<p>${esc(paragraf)}</p>`).join("")}
          </div>
          <aside class="termasuk-box">
            <h2>Yang Anda dapatkan</h2>
            <ul>
              ${
                p.termasuk.length
                  ? p.termasuk.map((item) => `<li>${ikon("centang")} <span>${esc(item)}</span></li>`).join("")
                  : `<li>${ikon("centang")} <span>Rangkaian bunga siap kirim</span></li>`
              }
            </ul>
            <p class="catatan">Ingin mengubah warna, ukuran, atau tulisan? Sampaikan saat pemesanan, tim kami akan menyesuaikan tanpa biaya konsultasi.</p>
          </aside>
        </div>
      </div>
    </section>

    <section class="section section-cream">
      <div class="container">
        <div class="section-head">
          <span class="eyebrow">Pilihan lainnya</span>
          <h2>Produk yang mungkin Anda suka</h2>
        </div>
        <div class="produk-grid">
          ${terkait.map(kartuProduk).join("")}
        </div>
      </div>
    </section>`;

  return layout({
    judul: `${p.nama} | ${toko.nama} ${toko.kota}`,
    deskripsi: potongTeks(p.ringkas || p.deskripsi[0] || p.nama),
    jalur: `/produk/${p.slug}/`,
    isi,
    aktif: "katalog",
    gambarOg: p.gambarOg || p.gambar,
    lebarOg: 1200,
    tinggiOg: p.gambarOg ? 630 : 900,
    tipeOg: "product",
    skema: [
      skemaRemah([
        { nama: "Beranda", jalur: "/" },
        { nama: "Katalog", jalur: "/katalog/" },
        { nama: p.nama, jalur: `/produk/${p.slug}/` },
      ]),
      {
        "@context": "https://schema.org",
        "@type": "Product",
        name: p.nama,
        image: [alamatAbsolut(p.gambar)],
        description: p.deskripsi.join(" ") || p.ringkas,
        sku: p.slug,
        category: p.kategori,
        brand: { "@type": "Brand", name: toko.nama },
        ...(tampilHarga
          ? {
              offers: {
                "@type": "Offer",
                url: alamatAbsolut(`/produk/${p.slug}/`),
                priceCurrency: "IDR",
                price: Number(p.harga),
                availability: "https://schema.org/InStock",
                itemCondition: "https://schema.org/NewCondition",
                seller: { "@type": "Organization", name: toko.nama, url: alamatAbsolut("/") },
              },
            }
          : {}),
      },
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Beranda", item: alamatAbsolut("/") },
          { "@type": "ListItem", position: 2, name: "Katalog", item: alamatAbsolut("/katalog/") },
          { "@type": "ListItem", position: 3, name: p.nama, item: alamatAbsolut(`/produk/${p.slug}/`) },
        ],
      },
    ],
  });
};

/* ----------------------------- Halaman 404 ----------------------------- */

const slugArea = (nama) =>
  String(nama || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const deskripsiArea = (area) => {
  const khusus = {
    "Padang Panjang":
      "Padang Panjang adalah pusat layanan utama kami. Pesanan dapat diantar ke rumah, kantor, sekolah, rumah sakit, hingga gedung acara di seluruh kota.",
    Batipuh:
      "Untuk acara di Batipuh dan sekitarnya, kami menyiapkan papan bunga dengan jadwal pengiriman yang disesuaikan agar tiba tepat waktu.",
    "X Koto":
      "Kami melayani pengiriman papan bunga ke X Koto dengan penyesuaian waktu acara dan konfirmasi biaya pengiriman di awal.",
    Batusangkar:
      "Untuk acara di Batusangkar, kami menyediakan papan bunga dengan desain custom dan pengiriman terjadwal.",
    "Kabupaten Tanah Datar":
      "Kami menjangkau seluruh Kabupaten Tanah Datar untuk kebutuhan papan bunga ucapan, duka cita, grand opening, dan lainnya.",
  };
  return (
    khusus[area] ||
    `Kami melayani pengiriman papan bunga ke ${area} dengan desain custom dan jadwal yang disesuaikan.`
  );
};

const halamanArea = (area) => {
  const slug = slugArea(area);
  const pesanWa = `Halo ${toko.nama}, saya ingin memesan papan bunga untuk acara di ${area}. Berikut detail acara saya: `;
  const isi = `
    <section class="page-hero">
      <div class="container">
        <nav class="breadcrumb" aria-label="Breadcrumb">
          <a href="/">Beranda</a> ${ikon("chevron")} <span>Area ${esc(area)}</span>
        </nav>
        <span class="eyebrow">Area layanan</span>
        <h1>Papan bunga di ${esc(area)}</h1>
        <p>${esc(deskripsiArea(area))} Pilih desain di katalog atau konsultasikan kebutuhan Anda dengan tim kami.</p>
      </div>
    </section>

    <section class="section-tight">
      <div class="container">
        <div class="section-head left" style="display:flex;align-items:flex-end;justify-content:space-between;gap:24px;flex-wrap:wrap;max-width:none;">
          <div style="max-width:560px;">
            <span class="eyebrow">Katalog</span>
            <h2>Pilihan papan bunga untuk ${esc(area)}</h2>
            <p>${produk.length} desain siap dipesan, tulisan dan warna dapat disesuaikan.</p>
          </div>
          <a class="btn btn-outline" href="/katalog/">Lihat semua ${ikon("panah")}</a>
        </div>
        <div class="produk-grid">
          ${produk.map(kartuProduk).join("")}
        </div>
      </div>
    </section>

    <section class="cta-band">
      <div class="container cta-inner">
        <div>
          <h2>Butuh papan bunga untuk acara di ${esc(area)}?</h2>
          <p>Konsultasikan desain, ukuran, dan jadwal pengiriman. Kami bantu rekomendasikan yang paling sesuai.</p>
        </div>
        <div class="cta-actions">
          <a class="btn btn-gold" href="${tautanWa(pesanWa)}" target="_blank" rel="noopener">${ikon("wa")} Chat WhatsApp</a>
          <a class="btn btn-outline" href="/katalog/">Lihat katalog</a>
        </div>
      </div>
    </section>`;
  return layout({
    judul: `Papan Bunga ${area} | ${toko.nama}`,
    deskripsi: potongTeks(
      `Papan bunga di ${area} dari ${toko.nama}. Pilihan papan bunga ucapan selamat, duka cita, grand opening, pernikahan, wisuda, dan custom. Pesan via WhatsApp, pengiriman terjadwal.`,
    ),
    jalur: `/area/${slug}/`,
    isi,
    aktif: "katalog",
    skema: [
      skemaRemah([
        { nama: "Beranda", jalur: "/" },
        { nama: `Area ${area}`, jalur: `/area/${slug}/` },
      ]),
      {
        "@context": "https://schema.org",
        "@type": "ItemList",
        name: `Papan bunga di ${area}`,
        numberOfItems: produk.length,
        itemListElement: produk.map((p, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: p.nama,
          url: alamatAbsolut(`/produk/${p.slug}/`),
        })),
      },
    ],
  });
};

const areaDipakai = [...new Set(toko.area || [])];

const halaman404 = () =>
  layout({
    judul: `Halaman tidak ditemukan | ${toko.nama}`,
    deskripsi: "Halaman yang Anda cari tidak ditemukan. Silakan kembali ke beranda atau lihat katalog papan bunga kami.",
    jalur: "/404.html",
    isi: `
    <section class="notfound">
      <div class="container">
        <span class="eyebrow" style="justify-content:center;">404</span>
        <h1>Halaman tidak ditemukan</h1>
        <p>Mungkin tautannya berubah atau sudah dihapus. Silakan kembali ke beranda atau lihat katalog kami.</p>
        <div class="hero-actions" style="justify-content:center;">
          <a class="btn btn-primary" href="/">Kembali ke beranda</a>
          <a class="btn btn-outline" href="/katalog/">Lihat katalog</a>
        </div>
      </div>
    </section>`,
    noindex: true,
  });

/* ----------------------------- Tulis berkas ---------------------------- */

const tulis = (jalur, isi) => {
  const tujuan = path.join(DIST, jalur);
  fs.mkdirSync(path.dirname(tujuan), { recursive: true });
  fs.writeFileSync(tujuan, isi, "utf8");
};

const salinFolder = (dari, ke) => {
  if (!fs.existsSync(dari)) return;
  fs.cpSync(dari, ke, { recursive: true });
};

fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(DIST, { recursive: true });

tulis("index.html", beranda());
tulis("katalog/index.html", halamanKatalog());
for (const k of semuaKategori) {
  tulis(`katalog/${k.slug}/index.html`, halamanKategori(k));
}
for (const p of produk) {
  tulis(`produk/${p.slug}/index.html`, halamanProduk(p));
}
tulis("404.html", halaman404());
tulis("galeri/index.html", halamanGaleri());
for (const area of areaDipakai) {
  tulis(`area/${slugArea(area)}/index.html`, halamanArea(area));
}

salinFolder(path.join(ROOT, "gambar"), path.join(DIST, "gambar"));
salinFolder(path.join(ROOT, "aset"), path.join(DIST, "aset"));
// Cache-busting: salin CSS/JS dengan nama ber-hash agar URL unik per konten
fs.copyFileSync(path.join(ROOT, "aset", "style.css"), path.join(DIST, "aset", `main.${CSS_HASH}.css`));
fs.copyFileSync(path.join(ROOT, "aset", "app.js"), path.join(DIST, "aset", `app.${JS_HASH}.js`));
fs.copyFileSync(path.join(ROOT, "favicon.svg"), path.join(DIST, "favicon.svg"));

// Header cache-control: cegah cache stale di CDN/browser
const headersIsi = `/*\n  Cache-Control: no-cache, no-store, must-revalidate\n\n/aset/main.*.css\n  Cache-Control: public, max-age=31536000, immutable\n\n/aset/app.*.js\n  Cache-Control: public, max-age=31536000, immutable\n`;
tulis("_headers", headersIsi);

const urlSitemap = [
  { jalur: "/", prioritas: "1.0" },
  { jalur: "/katalog/", prioritas: "0.9" },
  { jalur: "/galeri/", prioritas: "0.8" },
  ...semuaKategori.map((k) => ({ jalur: `/katalog/${k.slug}/`, prioritas: "0.85" })),
  ...produk.map((p) => ({ jalur: `/produk/${p.slug}/`, prioritas: "0.8" })),
  ...areaDipakai.map((a) => ({ jalur: `/area/${slugArea(a)}/`, prioritas: "0.7" })),
];

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlSitemap
  .map(
    (u) => `  <url>
    <loc>${alamatAbsolut(u.jalur)}</loc>
    <lastmod>${tanggalHariIni}</lastmod>
    <changefreq>${u.jalur === "/" ? "weekly" : "monthly"}</changefreq>
    <priority>${u.prioritas}</priority>
  </url>`,
  )
  .join("\n")}
</urlset>
`;

const robots = `User-agent: *
Allow: /

Sitemap: ${alamatAbsolut("/sitemap.xml")}
`;

tulis("sitemap.xml", sitemap);
tulis("robots.txt", robots);
tulis(
  "_redirects",
  `/*    /404.html   404
`,
);

console.log("Website berhasil dibuat di folder dist/");
console.log(`  Halaman beranda : 1`);
console.log(`  Halaman katalog : 1`);
console.log(`  Halaman produk  : ${produk.length}`);
console.log(`  Sitemap         : ${urlSitemap.length} URL`);
console.log(`  Base URL        : ${tanpaGarisMiring(toko.url)}`);
if (toko.url.includes("netlify.app")) {
  console.log("");
  console.log("Catatan: ganti url di data/toko.json setelah website mendapat alamat tetap.");
}
if (!/^62\d{8,}$/.test(nomorWa)) {
  console.log("Catatan: nomor WhatsApp sebaiknya memakai format 62xxx tanpa tanda plus.");
}
