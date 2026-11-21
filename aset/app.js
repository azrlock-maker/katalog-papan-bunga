/* ==========================================================================
   Akio Florist - interaksi ringan tanpa library
   ========================================================================== */

(function () {
  "use strict";

  /* ----------------------------- Mode terang / gelap --------------------- */

  var tombolTema = document.querySelector("[data-tema-toggle]");
  var metaTema = document.getElementById("meta-tema");
  var WARNA_TEMA = { light: "#0b4f45", dark: "#06120f" };

  function terapkanTema(tema) {
    var t = tema === "dark" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", t);
    try {
      localStorage.setItem("akio-tema", t);
      localStorage.setItem("akio-tema-manual", new Date().toDateString());
    } catch (e) {}
    if (tombolTema) {
      tombolTema.setAttribute(
        "aria-label",
        t === "dark" ? "Ganti ke mode terang" : "Ganti ke mode gelap",
      );
      tombolTema.setAttribute(
        "title",
        t === "dark" ? "Mode terang" : "Mode gelap",
      );
    }
    if (metaTema) metaTema.setAttribute("content", WARNA_TEMA[t]);
  }

  if (tombolTema) {
    tombolTema.addEventListener("click", function () {
      var sekarang = document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
      terapkanTema(sekarang === "dark" ? "light" : "dark");
    });
    terapkanTema(document.documentElement.getAttribute("data-theme") || "light");
  }

  /* ----------------------------- Menu mobile --------------------------- */

  var tombolMenu = document.querySelector(".nav-toggle");
  var ikonBuka = document.querySelector(".nav-toggle-buka");
  var ikonTutup = document.querySelector(".nav-toggle-tutup");

  function tutupMenu() {
    document.body.classList.remove("nav-open");
    if (tombolMenu) {
      tombolMenu.setAttribute("aria-expanded", "false");
      tombolMenu.setAttribute("aria-label", "Buka menu");
    }
    if (ikonBuka) ikonBuka.hidden = false;
    if (ikonTutup) ikonTutup.hidden = true;
  }

  if (tombolMenu) {
    tombolMenu.addEventListener("click", function () {
      var terbuka = document.body.classList.toggle("nav-open");
      tombolMenu.setAttribute("aria-expanded", terbuka ? "true" : "false");
      tombolMenu.setAttribute("aria-label", terbuka ? "Tutup menu" : "Buka menu");
      if (ikonBuka) ikonBuka.hidden = terbuka;
      if (ikonTutup) ikonTutup.hidden = !terbuka;
    });

    document.querySelectorAll(".site-nav a").forEach(function (tautan) {
      tautan.addEventListener("click", tutupMenu);
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") tutupMenu();
    });

    window.addEventListener("resize", function () {
      if (window.innerWidth > 760) tutupMenu();
    });
  }

  /* ----------------------------- Filter katalog ------------------------ */

  var daftar = document.getElementById("daftar-produk");

  if (daftar) {
    var chips = Array.prototype.slice.call(document.querySelectorAll(".chip[data-filter]"));
    var kotakCari = document.getElementById("cari-produk");
    var info = document.getElementById("info-hasil");
    var kosong = document.getElementById("kosong");
    var item = Array.prototype.slice.call(daftar.querySelectorAll(".produk-item"));
    var jumlahSemua = item.length;
    var filterAktif = "semua";

    function slugKategori() {
      var params = new URLSearchParams(window.location.search);
      return params.get("kategori") || "semua";
    }

    function terapkan() {
      var kata = kotakCari ? kotakCari.value.trim().toLowerCase() : "";
      var tampil = 0;

      item.forEach(function (kotak) {
        var cocokKategori =
          filterAktif === "semua" || kotak.getAttribute("data-kategori") === filterAktif;
        var cocokCari = !kata || (kotak.getAttribute("data-cari") || "").indexOf(kata) !== -1;
        var tampilkan = cocokKategori && cocokCari;
        kotak.style.display = tampilkan ? "" : "none";
        if (tampilkan) tampil += 1;
      });

      if (info) {
        info.textContent =
          tampil === jumlahSemua
            ? "Menampilkan " + jumlahSemua + " produk"
            : "Menampilkan " + tampil + " dari " + jumlahSemua + " produk";
      }
      if (kosong) kosong.style.display = tampil === 0 ? "block" : "none";
    }

    function pilihChip(slug, perbaruiUrl) {
      filterAktif = slug || "semua";
      chips.forEach(function (chip) {
        chip.setAttribute("aria-pressed", chip.getAttribute("data-filter") === filterAktif ? "true" : "false");
      });

      if (perbaruiUrl && window.history && window.history.replaceState) {
        var url = new URL(window.location.href);
        if (filterAktif === "semua") {
          url.searchParams.delete("kategori");
        } else {
          url.searchParams.set("kategori", filterAktif);
        }
        window.history.replaceState({}, "", url.pathname + (url.search ? url.search : "") + url.hash);
      }

      terapkan();
    }

    chips.forEach(function (chip) {
      chip.addEventListener("click", function () {
        pilihChip(chip.getAttribute("data-filter"), true);
        var judul = document.getElementById("daftar-produk");
        if (judul && window.scrollY > judul.offsetTop + 200) {
          window.scrollTo({ top: judul.offsetTop - 110, behavior: "smooth" });
        }
      });
    });

    if (kotakCari) {
      kotakCari.addEventListener("input", terapkan);
    }

    var awal = slugKategori();
    var adaChip = chips.some(function (chip) {
      return chip.getAttribute("data-filter") === awal;
    });
    pilihChip(adaChip ? awal : "semua", false);
  }

  /* ----------------------------- Animasi muncul ------------------------ */

  var elemenReveal = Array.prototype.slice.call(document.querySelectorAll(".reveal"));

  if (elemenReveal.length) {
    if ("IntersectionObserver" in window) {
      var pengamat = new IntersectionObserver(
        function (entri) {
          entri.forEach(function (e) {
            if (e.isIntersecting) {
              e.target.classList.add("is-visible");
              pengamat.unobserve(e.target);
            }
          });
        },
        { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
      );
      elemenReveal.forEach(function (el) {
        pengamat.observe(el);
      });
    } else {
      elemenReveal.forEach(function (el) {
        el.classList.add("is-visible");
      });
    }
  }

  /* ----------------------------- Tahun otomatis ------------------------ */

  /* ----------------------------- Quick view / pesan cepat ---------------- */
  var qv = document.getElementById("quickview");
  if (qv) {
    var qvNama = document.getElementById("qv-nama");
    var qvForm = document.getElementById("qv-form");
    var qvWa = qv.getAttribute("data-wa") || "6281344703332";

    function bukaQv(nama) {
      if (qvNama) qvNama.textContent = "Pesan: " + (nama || "Papan Bunga");
      qv.setAttribute("aria-hidden", "false");
      document.body.classList.add("qv-open");
      var inputNama = qvForm ? qvForm.querySelector('[name="nama"]') : null;
      if (inputNama) setTimeout(function () { inputNama.focus(); }, 50);
    }

    function tutupQv() {
      qv.setAttribute("aria-hidden", "true");
      document.body.classList.remove("qv-open");
    }

    document.querySelectorAll(".btn-quickview").forEach(function (btn) {
      btn.addEventListener("click", function () {
        bukaQv(btn.getAttribute("data-nama"));
      });
    });

    qv.querySelectorAll("[data-qv-close]").forEach(function (el) {
      el.addEventListener("click", tutupQv);
    });

    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && qv.getAttribute("aria-hidden") === "false") tutupQv();
    });

    if (qvForm) {
      qvForm.addEventListener("submit", function (e) {
        e.preventDefault();
        var fd = new FormData(qvForm);
        var namaProduk = (qvNama && qvNama.textContent.replace(/^Pesan:\s*/, "")) || "Papan Bunga";
        var pesan = "Halo AKIO FLORIST, saya ingin pesan " + namaProduk + ".\n";
        pesan += "Nama pemesan: " + (fd.get("nama") || "") + "\n";
        pesan += "WhatsApp: " + (fd.get("wa") || "") + "\n";
        pesan += "Teks di papan: " + (fd.get("teks") || "") + "\n";
        if (fd.get("tanggal")) pesan += "Tanggal acara: " + fd.get("tanggal") + "\n";
        if (fd.get("catatan")) pesan += "Catatan: " + fd.get("catatan") + "\n";
        pesan += "Mohon info harga & jadwal. Terima kasih.";
        var url = "https://wa.me/" + qvWa + "?text=" + encodeURIComponent(pesan);
        window.open(url, "_blank", "noopener");
        tutupQv();
        qvForm.reset();
      });
    }
  }

  /* ----------------------------- Validasi ulasan ------------------------ */
  var formulirUlasan = document.querySelectorAll("[data-ulasan-form]");
  if (formulirUlasan.length) {
    var KUNCI_ULASAN = "akio-ulasan-terkirim";
    var POLA_SPAM = /(viagra|casino|slot|judi|judol|seo|backlink|https?:\/\/|www\.|\.com\b|\.ru\b|\.xyz\b|click here|beli follower|investasi|crypto|bitcoin|pinjaman|wa\.me)/i;
    var POLA_NAMA = /^[A-Za-zÀ-ÿ' .,\-]+$/;

    Array.prototype.forEach.call(formulirUlasan, function (form) {
      var fieldWaktu = form.querySelector("[data-waktu-buka]");
      var areaError = form.querySelector("[data-ulasan-error]");
      var tombol = form.querySelector('button[type="submit"]');
      if (fieldWaktu) fieldWaktu.value = String(Date.now());

      function tampilError(pesan, elemen) {
        if (areaError) { areaError.textContent = pesan; areaError.hidden = false; }
        if (elemen && typeof elemen.focus === "function") elemen.focus();
      }
      function hapusError() {
        if (areaError) { areaError.textContent = ""; areaError.hidden = true; }
      }

      form.addEventListener("input", hapusError);
      form.addEventListener("change", hapusError);

      form.addEventListener("submit", function (e) {
        hapusError();
        var data = new FormData(form);
        var nama = String(data.get("nama") || "").trim();
        var kota = String(data.get("kota") || "").trim();
        var rating = String(data.get("rating") || "");
        var ulasan = String(data.get("ulasan") || "").trim();
        var inputNama = form.querySelector('[name="nama"]');
        var inputKota = form.querySelector('[name="kota"]');
        var inputUlasan = form.querySelector('[name="ulasan"]');
        var inputRating = form.querySelector('[name="rating"]');
        var inputKonfirmasi = form.querySelector('[name="konfirmasi"]');

        // 1. Honeypot terisi = bot.
        var jebakan = form.querySelectorAll('[data-honeypot], [name="_honey"]');
        for (var i = 0; i < jebakan.length; i++) {
          if (String(jebakan[i].value || "").trim() !== "") {
            e.preventDefault();
            tampilError("Pengiriman ditolak. Silakan coba lagi nanti.");
            return;
          }
        }

        // 2. Diisi terlalu cepat = bot.
        var buka = Number(fieldWaktu && fieldWaktu.value) || 0;
        if (buka && Date.now() - buka < 3000) {
          e.preventDefault();
          tampilError("Terlalu cepat. Luangkan beberapa saat untuk menulis ulasan.", inputUlasan);
          return;
        }

        // 3. Maksimal satu ulasan per perangkat per 24 jam.
        try {
          var terakhir = Number(localStorage.getItem(KUNCI_ULASAN) || 0);
          if (terakhir && Date.now() - terakhir < 86400000) {
            e.preventDefault();
            tampilError("Terima kasih. Ulasan dari perangkat ini sudah tercatat.");
            return;
          }
        } catch (err) {}

        // 4. Validasi isi agar tidak menjadi sarang spam.
        if (nama.length < 2 || !POLA_NAMA.test(nama)) {
          e.preventDefault();
          tampilError("Nama harus 2–60 huruf tanpa angka atau tautan.", inputNama);
          return;
        }
        if (kota && (kota.length > 40 || !POLA_NAMA.test(kota))) {
          e.preventDefault();
          tampilError("Nama kota tidak valid.", inputKota);
          return;
        }
        if (!/^[1-5]$/.test(rating)) {
          e.preventDefault();
          tampilError("Pilih rating terlebih dahulu.", inputRating);
          return;
        }
        if (ulasan.length < 20 || ulasan.length > 800) {
          e.preventDefault();
          tampilError("Ulasan sebaiknya 20–800 karakter.", inputUlasan);
          return;
        }
        if (ulasan.split(/\s+/).filter(Boolean).length < 4) {
          e.preventDefault();
          tampilError("Tulis ulasan yang lebih lengkap (minimal 4 kata).", inputUlasan);
          return;
        }
        if (POLA_SPAM.test(ulasan) || POLA_SPAM.test(nama)) {
          e.preventDefault();
          tampilError("Ulasan mengandung tautan atau kata promosi yang tidak diizinkan.", inputUlasan);
          return;
        }
        if (/<[^>]*>|&\w+;/i.test(ulasan) || /(.)\1{6,}/.test(ulasan)) {
          e.preventDefault();
          tampilError("Ulasan tidak valid. Hapus kode/format atau huruf berulang.", inputUlasan);
          return;
        }
        if (inputKonfirmasi && !inputKonfirmasi.checked) {
          e.preventDefault();
          tampilError("Centang konfirmasi bahwa Anda pernah memesan.", inputKonfirmasi);
          return;
        }

        // 5. Lolos: buang honeypot dari payload, kunci pengiriman, submit asli.
        var decoy = form.querySelectorAll("[data-honeypot]");
        for (var j = 0; j < decoy.length; j++) decoy[j].disabled = true;
        try { localStorage.setItem(KUNCI_ULASAN, String(Date.now())); } catch (err) {}
        if (tombol) { tombol.disabled = true; tombol.textContent = "Mengirim…"; }
        HTMLFormElement.prototype.submit.call(form);
      });
    });
  }

  /* ----------------------------- Lightbox galeri ------------------------ */
  var lb = document.getElementById("lightbox");
  if (lb) {
    var lbImg = document.getElementById("lb-img");
    var lbCap = document.getElementById("lb-caption");
    var lbItems = Array.prototype.slice.call(document.querySelectorAll(".galeri-item"));
    var lbIndex = 0;
    var galeriData = window.GALERI || [];

    function bukaLb(i) {
      lbIndex = (i + lbItems.length) % lbItems.length;
      var item = galeriData[lbIndex] || {};
      if (lbImg) { lbImg.src = item.src || ""; lbImg.alt = item.judul || ""; }
      if (lbCap) lbCap.textContent = item.judul || "";
      lb.setAttribute("aria-hidden", "false");
      document.body.classList.add("lb-open");
    }
    function tutupLb() {
      lb.setAttribute("aria-hidden", "true");
      document.body.classList.remove("lb-open");
      if (lbImg) lbImg.src = "";
    }
    function navLb(dir) {
      bukaLb(lbIndex + dir);
    }

    lbItems.forEach(function (el, i) {
      el.addEventListener("click", function () { bukaLb(i); });
    });
    lb.querySelectorAll("[data-lb-close]").forEach(function (el) {
      el.addEventListener("click", tutupLb);
    });
    var prev = lb.querySelector("[data-lb-prev]");
    var next = lb.querySelector("[data-lb-next]");
    if (prev) prev.addEventListener("click", function () { navLb(-1); });
    if (next) next.addEventListener("click", function () { navLb(1); });
    document.addEventListener("keydown", function (e) {
      if (lb.getAttribute("aria-hidden") === "true") return;
      if (e.key === "Escape") tutupLb();
      if (e.key === "ArrowLeft") navLb(-1);
      if (e.key === "ArrowRight") navLb(1);
    });
  }

  var tahun = document.getElementById("tahun");
  if (tahun) tahun.textContent = new Date().getFullYear();
})();
