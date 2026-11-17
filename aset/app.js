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

  var tahun = document.getElementById("tahun");
  if (tahun) tahun.textContent = new Date().getFullYear();
})();
