/**
 * Server kecil untuk melihat hasil website di komputer sendiri.
 * Jalankan: node alat/pratinjau.js
 * Lalu buka: http://localhost:5173
 */

const http = require("http");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");

const DIST = path.join(__dirname, "..", "dist");
const PORT = Number(process.env.PORT) || 5173;

const tipe = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
};

if (!fs.existsSync(DIST)) {
  console.error("Folder dist/ belum ada. Jalankan dulu: node build.js");
  process.exit(1);
}

const server = http.createServer((req, res) => {
  let jalur = decodeURIComponent(req.url.split("?")[0]);
  let berkas = path.join(DIST, jalur);

  if (!berkas.startsWith(DIST)) {
    res.writeHead(403);
    res.end("Akses ditolak");
    return;
  }

  if (fs.existsSync(berkas) && fs.statSync(berkas).isDirectory()) {
    berkas = path.join(berkas, "index.html");
  }

  if (!fs.existsSync(berkas) && fs.existsSync(berkas + ".html")) {
    berkas += ".html";
  }

  if (!fs.existsSync(berkas)) {
    const halaman404 = path.join(DIST, "404.html");
    res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
    res.end(fs.existsSync(halaman404) ? fs.readFileSync(halaman404) : "Halaman tidak ditemukan");
    return;
  }

  res.writeHead(200, {
    "Content-Type": tipe[path.extname(berkas).toLowerCase()] || "application/octet-stream",
    "Cache-Control": "no-store",
  });
  fs.createReadStream(berkas).pipe(res);
});

server.listen(PORT, () => {
  const alamat = "http://localhost:" + PORT;
  console.log("Website berjalan di " + alamat);
  console.log("Tekan Ctrl+C untuk berhenti.");

  if (process.platform === "win32" && process.env.NO_OPEN !== "1") {
    exec('start "" "' + alamat + '"');
  }
});
