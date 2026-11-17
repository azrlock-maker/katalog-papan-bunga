# Akio Florist — Katalog Papan Bunga

Website katalog statis (HTML/CSS/JS) yang cepat, responsif, dan siap tampil di
pencarian Google. Semua isi diatur dari folder `data/`.

- **Lihat di komputer:** klik dua kali `Lihat Website.cmd`
- **Panduan lengkap:** [PANDUAN-WEBSITE.md](PANDUAN-WEBSITE.md)
- **Panel admin:** <https://app.pagescms.org> (setelah repo terhubung)
- **Hosting:** Netlify (gratis)

## Perintah

```bash
node build.js          # membuat website di folder dist/
node alat/periksa.js   # memeriksa tautan, gambar, meta, dan data SEO
npm start              # build + pratinjau di http://localhost:5173
```

## Mengganti isi

| Yang diubah | Berkas |
|---|---|
| Produk, deskripsi, foto | `data/katalog.json` |
| Nama, WhatsApp, alamat, jam buka | `data/toko.json` |
| Kategori | `data/kategori.json` |
| Foto produk | folder `gambar/` |

Setelah mengubah data, jalankan `node build.js` (atau cukup commit ke GitHub —
Netlify membangun ulang otomatis).

> Ganti `url` setelah website punya alamat tetap, dan ganti seluruh gambar
> contoh dengan foto asli sebelum website dipublikasikan.
