/* =========================================================
   Borrow Service — UINSI Library
   Mengelola data peminjaman (records): siapa pinjam buku apa,
   kapan jatuh tempo, dan proses pengembalian.

   Aturan bisnis (diambil dari prototipe script.js lama):
   - Maksimal 3 buku aktif dipinjam per mahasiswa
   - Masa pinjam 7 hari
   - Buku yang sedang dipinjam tidak bisa "dipinjam lagi" di sini
   - Hanya mahasiswa yang meminjam yang boleh mengembalikan bukunya

   Service ini TIDAK memanggil Book Service secara langsung.
   Sesuai alur di script.js: frontend yang memanggil Book Service
   (pinjam/kembali status buku) DAN Borrow Service (catat/lunasi
   record peminjaman) secara terpisah.
   ========================================================= */

const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;
const MAX_ACTIVE_BORROWS = 3;
const BORROW_PERIOD_DAYS = 7;

// Penyimpanan in-memory (prototipe). Kalau butuh data yang tidak
// hilang saat server di-restart, ini tinggal diganti ke SQLite/file
// JSON — struktur endpoint di bawah tidak perlu berubah.
let records = [];
let nextId = 1;

function normalizeStudentId(id) {
  return String(id || "").trim().toUpperCase();
}

function addDays(isoDateString, days) {
  const date = new Date(isoDateString);
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

function countActiveBorrows(studentId) {
  const normalized = normalizeStudentId(studentId);
  return records.filter(
    (r) => normalizeStudentId(r.studentId) === normalized && r.status !== "returned"
  ).length;
}

/* ---------- GET /peminjaman ----------
   Semua record, atau difilter dengan ?studentId=S001
   (dipakai untuk gantikan getRecords() di frontend) */
app.get("/peminjaman", (req, res) => {
  const { studentId } = req.query;

  if (!studentId) {
    return res.json({ data: records });
  }

  const normalized = normalizeStudentId(studentId);
  const filtered = records.filter((r) => normalizeStudentId(r.studentId) === normalized);
  res.json({ data: filtered });
});

/* ---------- POST /peminjaman ----------
   Body: { studentId, bookId, title }
   Dipanggil SETELAH frontend berhasil PATCH /books/:id/pinjam
   ke Book Service. Endpoint ini yang menegakkan aturan bisnis
   peminjaman (bukan Book Service). */
app.post("/peminjaman", (req, res) => {
  const { studentId, bookId, title } = req.body;

  if (!studentId || !bookId) {
    return res.status(400).json({ message: "studentId dan bookId wajib diisi." });
  }

  const normalizedStudentId = normalizeStudentId(studentId);

  // Rule: maksimal 3 buku aktif per mahasiswa
  const activeCount = countActiveBorrows(normalizedStudentId);
  if (activeCount >= MAX_ACTIVE_BORROWS) {
    return res.status(400).json({
      message: `Mahasiswa sudah meminjam ${MAX_ACTIVE_BORROWS} buku aktif. Batas maksimum tercapai.`,
    });
  }

  // Rule: satu buku tidak boleh punya dua record aktif sekaligus
  // (jaga-jaga kalau ada double-submit atau race condition)
  const sudahAda = records.find((r) => r.bookId === bookId && r.status !== "returned");
  if (sudahAda) {
    return res.status(400).json({ message: "Buku ini sudah tercatat sedang dipinjam." });
  }

  const borrowDate = new Date().toISOString();
  const dueDate = addDays(borrowDate, BORROW_PERIOD_DAYS);

  const record = {
    recordId: `R${nextId++}`,
    studentId: normalizedStudentId,
    bookId,
    title: title || null,
    borrowDate,
    dueDate,
    status: "active",
  };

  records.push(record);
  res.status(201).json({ data: record });
});

/* ---------- PATCH /peminjaman/:recordId/kembalikan ----------
   Body: { studentId }  → dipakai untuk cek kepemilikan
   Dipanggil SEBELUM frontend PATCH /books/:id/kembali ke Book Service,
   atau sesudahnya — urutan bebas, tapi disarankan proses ini dulu
   supaya kalau ditolak (bukan pemilik / sudah dikembalikan), Book
   Service tidak perlu disentuh. */
app.patch("/peminjaman/:recordId/kembalikan", (req, res) => {
  const { recordId } = req.params;
  const { studentId } = req.body;

  const record = records.find((r) => r.recordId === recordId);

  if (!record) {
    return res.status(404).json({ message: "Data peminjaman tidak ditemukan." });
  }

  if (record.status === "returned") {
    return res.status(400).json({ message: "Buku ini sudah dikembalikan sebelumnya." });
  }

  // Rule: hanya mahasiswa yang meminjam yang boleh mengembalikan
  if (studentId && normalizeStudentId(studentId) !== record.studentId) {
    return res.status(403).json({ message: "Kamu tidak berhak mengembalikan buku ini." });
  }

  record.status = "returned";
  record.returnDate = new Date().toISOString();

  res.json({ data: record });
});

app.listen(PORT, () => {
  console.log(`Borrow Service jalan di http://localhost:${PORT}`);
});
