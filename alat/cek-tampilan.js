/**
 * Uji tampilan otomatis memakai Chrome yang sudah terpasang.
 * Jalankan: node alat/cek-tampilan.js  (server pratinjau harus aktif di :5173)
 */

const { spawn } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const CHROME = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const PORT = 9333;
const PROFIL = path.join(os.tmpdir(), "chrome-uji-papan-bunga");

const tunggu = (ms) => new Promise((r) => setTimeout(r, ms));

async function ambilTarget() {
  for (let i = 0; i < 40; i++) {
    try {
      const res = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      const daftar = await res.json();
      const halaman = daftar.find((t) => t.type === "page" && t.url.includes("localhost:5173"));
      if (halaman) return halaman;
    } catch (e) {
      // Chrome belum siap
    }
    await tunggu(250);
  }
  throw new Error("Chrome tidak merespons");
}

async function main() {
  fs.rmSync(PROFIL, { recursive: true, force: true });
  const chrome = spawn(CHROME, [
    "--headless=new",
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${PROFIL}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-extensions",
    "--hide-scrollbars",
    "http://localhost:5173/",
  ]);

  const target = await ambilTarget();
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve);
    ws.addEventListener("error", reject);
  });

  let id = 0;
  const tertunda = new Map();
  const logKonsol = [];

  ws.addEventListener("message", (pesan) => {
    const data = JSON.parse(pesan.data);
    if (data.id && tertunda.has(data.id)) {
      tertunda.get(data.id)(data);
      tertunda.delete(data.id);
    }
    if (data.method === "Runtime.exceptionThrown") {
      logKonsol.push("JS error: " + (data.params.exceptionDetails.text || ""));
    }
    if (data.method === "Log.entryAdded" && data.params.entry.level === "error") {
      logKonsol.push("Log: " + data.params.entry.text);
    }
  });

  const kirim = (method, params = {}) =>
    new Promise((resolve) => {
      const no = ++id;
      tertunda.set(no, resolve);
      ws.send(JSON.stringify({ id: no, method, params }));
    });

  await kirim("Runtime.enable");
  await kirim("Log.enable");
  await kirim("Page.enable");

  const evaluasi = async (ekspresi) => {
    const hasil = await kirim("Runtime.evaluate", {
      expression: ekspresi,
      returnByValue: true,
      awaitPromise: true,
    });
    if (hasil.result && hasil.result.exceptionDetails) {
      throw new Error(JSON.stringify(hasil.result.exceptionDetails));
    }
    return hasil.result.result.value;
  };

  await tunggu(1200);

  const uji = async (lebar, tinggi, nama) => {
    await kirim("Emulation.setDeviceMetricsOverride", {
      width: lebar,
      height: tinggi,
      deviceScaleFactor: 1,
      mobile: lebar < 600,
    });
    await tunggu(500);

    const hasil = await evaluasi(`(() => {
      const q = (s) => document.querySelector(s);
      const tampil = (el) => el && getComputedStyle(el).display !== "none" && el.offsetParent !== null;
      const nav = q(".site-nav");
      const toggle = q(".nav-toggle");
      return {
        lebarLayar: window.innerWidth,
        lebarDokumen: document.documentElement.scrollWidth,
        meluber: document.documentElement.scrollWidth > window.innerWidth + 1,
        judul: document.title,
        navTampil: tampil(nav),
        toggleTampil: tampil(toggle),
        heroGambar: q(".hero-media img") ? q(".hero-media img").naturalWidth : 0,
        jumlahKartu: [...document.querySelectorAll(".produk-card")].filter((e) => e.offsetParent !== null).length,
        tinggiHeader: q(".site-header") ? Math.round(q(".site-header").getBoundingClientRect().height) : 0,
        waTerlihat: (() => {
          const el = q(".wa-float");
          if (!el) return false;
          const r = el.getBoundingClientRect();
          return r.right <= window.innerWidth + 1 && r.bottom <= window.innerHeight + 1;
        })(),
        cssAktif: getComputedStyle(document.body).fontFamily.includes("Segoe UI") || getComputedStyle(document.body).fontFamily.includes("system-ui"),
      };
    })()`);

    console.log(`\n[${nama}] ${lebar}x${tinggi}`);
    console.log("  lebar dokumen :", hasil.lebarDokumen, hasil.meluber ? "MELUBER!" : "(aman)");
    console.log("  judul         :", hasil.judul);
    console.log("  header        :", hasil.tinggiHeader + "px | nav:", hasil.navTampil, "| tombol menu:", hasil.toggleTampil);
    console.log("  kartu terlihat:", hasil.jumlahKartu, "| CSS:", hasil.cssAktif ? "aktif" : "TIDAK AKTIF");
    console.log("  tombol WA     :", hasil.waTerlihat ? "terlihat" : "di luar layar");

    if (hasil.meluber) process.exitCode = 1;
    return hasil;
  };

  await uji(1440, 900, "Desktop");

  // Uji filter kategori di halaman katalog
  await kirim("Page.navigate", { url: "http://localhost:5173/katalog/" });
  await tunggu(1400);

  const filter = await evaluasi(`(async () => {
    const chip = [...document.querySelectorAll(".chip")].find((c) => c.dataset.filter === "duka-cita");
    chip.click();
    await new Promise((r) => setTimeout(r, 300));
    const terlihat = [...document.querySelectorAll(".produk-item")].filter((e) => e.offsetParent !== null).length;
    const url = location.search;
    const info = document.getElementById("info-hasil").textContent;
    document.querySelector('.chip[data-filter="semua"]').click();
    await new Promise((r) => setTimeout(r, 300));
    return { terlihat, url, info, semua: [...document.querySelectorAll(".produk-item")].filter((e) => e.offsetParent !== null).length };
  })()`);

  console.log("\n[Filter katalog]");
  console.log("  duka cita      :", filter.terlihat, "produk | URL:", filter.url || "(kosong)");
  console.log("  info           :", filter.info);
  console.log("  kembali semua  :", filter.semua, "produk");

  // Uji pencarian
  const cari = await evaluasi(`(async () => {
    const input = document.getElementById("cari-produk");
    input.value = "wisuda";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await new Promise((r) => setTimeout(r, 250));
    return [...document.querySelectorAll(".produk-item")].filter((e) => e.offsetParent !== null).length;
  })()`);
  console.log("  cari 'wisuda'  :", cari, "produk");

  // Uji menu mobile
  await uji(390, 844, "HP");
  const menu = await evaluasi(`(async () => {
    document.querySelector(".nav-toggle").click();
    await new Promise((r) => setTimeout(r, 350));
    const nav = document.querySelector(".site-nav");
    const terbuka = getComputedStyle(nav).display !== "none" && nav.getBoundingClientRect().height > 50;
    const tombol = document.querySelector(".nav-toggle");
    return { terbuka, aria: tombol.getAttribute("aria-expanded"), linkTerlihat: nav.querySelector("a").offsetParent !== null };
  })()`);
  console.log("  menu mobile    :", menu.terbuka ? "terbuka" : "GAGAL", "| aria-expanded:", menu.aria);

  // Cek halaman produk
  await kirim("Page.navigate", { url: "http://localhost:5173/produk/papan-bunga-ucapan-selamat/" });
  await tunggu(1000);
  const produk = await evaluasi(`(() => ({
    h1: document.querySelector("h1")?.textContent,
    harga: document.querySelector(".harga-nilai")?.textContent.trim(),
    wa: document.querySelector(".produk-cta a")?.href.slice(0, 60),
    skema: [...document.querySelectorAll('script[type="application/ld+json"]')].length,
    meluber: document.documentElement.scrollWidth > window.innerWidth + 1,
  }))()`);
  console.log("\n[Halaman produk]");
  console.log("  H1    :", produk.h1);
  console.log("  harga :", produk.harga);
  console.log("  WA    :", produk.wa + "...");
  console.log("  skema :", produk.skema, "blok | meluber:", produk.meluber);
  if (produk.meluber) process.exitCode = 1;

  // Beranda di HP
  await kirim("Page.navigate", { url: "http://localhost:5173/" });
  await tunggu(1200);
  await kirim("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true,
  });
  await tunggu(500);
  const homeHp = await evaluasi(`(() => {
    const img = document.querySelector(".hero-media img");
    const h1 = document.querySelector("h1");
    return {
      hero: img ? img.naturalWidth : 0,
      h1: h1 ? getComputedStyle(h1).fontSize : null,
      meluber: document.documentElement.scrollWidth > window.innerWidth + 1,
      kartu: [...document.querySelectorAll(".produk-card")].filter((e) => e.offsetParent !== null).length,
    };
  })()`);
  console.log("\n[Beranda di HP]");
  console.log("  hero gambar :", homeHp.hero ? "termuat (" + homeHp.hero + "px)" : "GAGAL");
  console.log("  ukuran H1   :", homeHp.h1);
  console.log("  kartu       :", homeHp.kartu, "| meluber:", homeHp.meluber);
  if (homeHp.meluber) process.exitCode = 1;

  // Tablet: pastikan menu dan tombol tidak bertumpuk
  for (const lebar of [780, 820, 1024]) {
    await kirim("Emulation.setDeviceMetricsOverride", {
      width: lebar,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await tunggu(350);
    const t = await evaluasi(`(() => {
      const nav = document.querySelector(".site-nav");
      const cta = document.querySelector(".header-cta");
      const menu = document.querySelector(".nav-toggle");
      const rn = nav.getBoundingClientRect();
      const rc = cta.getBoundingClientRect();
      const navTampil = getComputedStyle(nav).display !== "none";
      const ctaTampil = getComputedStyle(cta).display !== "none";
      const menuTampil = getComputedStyle(menu).display !== "none";
      return {
        bertumpuk: navTampil && ctaTampil && rn.right > rc.left - 4,
        navTampil, ctaTampil, menuTampil,
        meluber: document.documentElement.scrollWidth > window.innerWidth + 1,
      };
    })()`);
    console.log(
      `[Tablet ${lebar}] nav:${t.navTampil} cta:${t.ctaTampil} menu:${t.menuTampil} tumpuk:${t.bertumpuk} meluber:${t.meluber}`,
    );
    if (t.bertumpuk || t.meluber) process.exitCode = 1;
  }

  // Tautan langsung filter kategori
  await kirim("Page.navigate", { url: "http://localhost:5173/katalog/?kategori=duka-cita" });
  await tunggu(1200);
  const langsung = await evaluasi(`(() => ({
    terlihat: [...document.querySelectorAll(".produk-item")].filter((e) => e.offsetParent !== null).length,
    chipAktif: document.querySelector('.chip[aria-pressed="true"]')?.textContent.trim(),
  }))()`);
  console.log("\n[Filter dari tautan]");
  console.log("  produk terlihat:", langsung.terlihat, "| chip aktif:", langsung.chipAktif);
  if (langsung.terlihat !== 2) process.exitCode = 1;

  if (logKonsol.length) {
    console.log("\nKesalahan konsol:");
    for (const l of [...new Set(logKonsol)]) console.log("  -", l);
  } else {
    console.log("\nTidak ada error JavaScript di konsol.");
  }

  ws.close();
  chrome.kill();
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
