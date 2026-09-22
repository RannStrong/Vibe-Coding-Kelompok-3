// ========================================================
// BOOK SERVICE
// REST API sederhana untuk mengelola data buku perpustakaan
// Penyimpanan data: file JSON (data/books.json)
//
// CATATAN PENTING:
// Book Service HANYA bertanggung jawab atas data & status buku.
// Logika peminjaman (siapa meminjam, tanggal pinjam, denda, dll)
// TIDAK ada di sini — itu tugas service lain (Borrow Service)
// yang akan memanggil endpoint-endpoint Book Service ini untuk
// mengubah status buku.
// ========================================================

const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 3000;

// Lokasi file JSON yang menjadi "database" kita
const DB_PATH = path.join(__dirname, "data", "books.json");

// Supaya Express bisa membaca body request berformat JSON
app.use(express.json());

// --------------------------------------------------------
// CORS
// Wajib ada karena Frontend (index.html) dan Book Service ini
// jalan di origin/port yang berbeda (mis. Live Server di 5500,
// Book Service di 3000). Tanpa ini, browser akan MEMBLOKIR
// semua fetch() dari Frontend ke sini walaupun server-nya jalan.
// --------------------------------------------------------
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PATCH, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

// --------------------------------------------------------
// FUNGSI BANTUAN (HELPER) UNTUK BACA & TULIS FILE JSON
// --------------------------------------------------------

function bacaSemuaBuku() {
  const data = fs.readFileSync(DB_PATH, "utf-8");
  return JSON.parse(data);
}

function simpanSemuaBuku(daftarBuku) {
  fs.writeFileSync(DB_PATH, JSON.stringify(daftarBuku, null, 2), "utf-8");
}

// Menghasilkan id baru yang belum dipakai (id tertinggi + 1)
function idBaru(daftarBuku) {
  if (daftarBuku.length === 0) return 1;
  const idTertinggi = Math.max(...daftarBuku.map((b) => b.id));
  return idTertinggi + 1;
}

// --------------------------------------------------------
// ENDPOINT 1: GET /books
// Menampilkan SELURUH buku yang ada di perpustakaan
// --------------------------------------------------------
app.get("/books", (req, res) => {
  const semuaBuku = bacaSemuaBuku();
  res.json({
    total: semuaBuku.length,
    data: semuaBuku,
  });
});

// --------------------------------------------------------
// ENDPOINT 2: GET /books/available
// Menampilkan HANYA buku yang statusnya "tersedia"
// Catatan: rute ini harus didaftarkan SEBELUM "/books/:id"
// supaya kata "available" tidak dianggap sebagai :id
// --------------------------------------------------------
app.get("/books/available", (req, res) => {
  const semuaBuku = bacaSemuaBuku();
  const bukuTersedia = semuaBuku.filter((buku) => buku.status === "tersedia");
  res.json({
    total: bukuTersedia.length,
    data: bukuTersedia,
  });
});

// --------------------------------------------------------
// ENDPOINT 3: GET /books/:id
// Mengambil detail satu buku berdasarkan ID
// --------------------------------------------------------
app.get("/books/:id", (req, res) => {
  const id = parseInt(req.params.id);

  if (Number.isNaN(id)) {
    return res.status(400).json({ message: "id harus berupa angka" });
  }

  const semuaBuku = bacaSemuaBuku();
  const buku = semuaBuku.find((b) => b.id === id);

  if (!buku) {
    return res.status(404).json({ message: `Buku dengan id ${id} tidak ditemukan` });
  }

  res.json({ data: buku });
});

// --------------------------------------------------------
// ENDPOINT 4 (BARU): POST /books
// Menambahkan buku baru ke katalog
// Body wajib: { judul, penulis, tahun }
// Status buku baru otomatis "tersedia"
// --------------------------------------------------------
app.post("/books", (req, res) => {
  const { judul, penulis, tahun } = req.body;

  if (!judul || typeof judul !== "string" || judul.trim() === "") {
    return res.status(400).json({ message: "judul wajib diisi dan berupa teks" });
  }
  if (!penulis || typeof penulis !== "string" || penulis.trim() === "") {
    return res.status(400).json({ message: "penulis wajib diisi dan berupa teks" });
  }
  if (tahun !== undefined && (typeof tahun !== "number" || !Number.isInteger(tahun))) {
    return res.status(400).json({ message: "tahun harus berupa angka" });
  }

  const semuaBuku = bacaSemuaBuku();

  const bukuBaru = {
    id: idBaru(semuaBuku),
    judul: judul.trim(),
    penulis: penulis.trim(),
    tahun: tahun ?? null,
    status: "tersedia",
  };

  semuaBuku.push(bukuBaru);
  simpanSemuaBuku(semuaBuku);

  res.status(201).json({ message: `Buku "${bukuBaru.judul}" berhasil ditambahkan`, data: bukuBaru });
});

// --------------------------------------------------------
// ENDPOINT 5 (BARU): DELETE /books/:id
// Menghapus buku dari katalog
// Buku yang sedang berstatus "dipinjam" tidak boleh dihapus
// dulu, supaya data peminjaman yang mereferensikannya (di
// Borrow Service nanti) tidak jadi rusak/menggantung.
// --------------------------------------------------------
app.delete("/books/:id", (req, res) => {
  const id = parseInt(req.params.id);

  if (Number.isNaN(id)) {
    return res.status(400).json({ message: "id harus berupa angka" });
  }

  const semuaBuku = bacaSemuaBuku();
  const buku = semuaBuku.find((b) => b.id === id);

  if (!buku) {
    return res.status(404).json({ message: `Buku dengan id ${id} tidak ditemukan` });
  }

  if (buku.status === "dipinjam") {
    return res.status(400).json({
      message: "Buku yang sedang dipinjam tidak bisa dihapus. Tunggu sampai dikembalikan.",
    });
  }

  const bukuSetelahHapus = semuaBuku.filter((b) => b.id !== id);
  simpanSemuaBuku(bukuSetelahHapus);

  res.json({ message: `Buku "${buku.judul}" berhasil dihapus` });
});

// --------------------------------------------------------
// ENDPOINT 6: PATCH /books/:id/pinjam
// Mengubah status buku menjadi "dipinjam"
// --------------------------------------------------------
app.patch("/books/:id/pinjam", (req, res) => {
  const id = parseInt(req.params.id);

  if (Number.isNaN(id)) {
    return res.status(400).json({ message: "id harus berupa angka" });
  }

  const semuaBuku = bacaSemuaBuku();
  const buku = semuaBuku.find((b) => b.id === id);

  if (!buku) {
    return res.status(404).json({ message: `Buku dengan id ${id} tidak ditemukan` });
  }

  if (buku.status === "dipinjam") {
    return res.status(400).json({ message: "Buku ini sudah dalam status dipinjam" });
  }

  buku.status = "dipinjam";
  simpanSemuaBuku(semuaBuku);

  res.json({ message: `Buku "${buku.judul}" berhasil diubah menjadi dipinjam`, data: buku });
});

// --------------------------------------------------------
// ENDPOINT 7: PATCH /books/:id/kembali
// Mengubah status buku menjadi "tersedia" kembali
// --------------------------------------------------------
app.patch("/books/:id/kembali", (req, res) => {
  const id = parseInt(req.params.id);

  if (Number.isNaN(id)) {
    return res.status(400).json({ message: "id harus berupa angka" });
  }

  const semuaBuku = bacaSemuaBuku();
  const buku = semuaBuku.find((b) => b.id === id);

  if (!buku) {
    return res.status(404).json({ message: `Buku dengan id ${id} tidak ditemukan` });
  }

  if (buku.status === "tersedia") {
    return res.status(400).json({ message: "Buku ini sudah dalam status tersedia" });
  }

  buku.status = "tersedia";
  simpanSemuaBuku(semuaBuku);

  res.json({ message: `Buku "${buku.judul}" berhasil diubah menjadi tersedia`, data: buku });
});

// --------------------------------------------------------
// Menangani route yang tidak dikenal (404 umum)
// --------------------------------------------------------
app.use((req, res) => {
  res.status(404).json({ message: "Endpoint tidak ditemukan. Coba /books" });
});

// --------------------------------------------------------
// Menjalankan server
// --------------------------------------------------------
app.listen(PORT, () => {
  console.log(`Book Service berjalan di http://localhost:${PORT}`);
});