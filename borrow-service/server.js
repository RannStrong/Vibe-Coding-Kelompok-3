/* =========================================================
   Borrow Service — UINSI Library
   Mengelola data peminjaman (records): siapa pinjam buku apa,
   kapan jatuh tempo, dan proses pengembalian.

   Aturan bisnis (diambil dari prototipe script.js lama):
   - Maksimal 3 buku aktif dipinjam per mahasiswa
   - Masa pinjam 7 hari
   - Buku yang sedang dipinjam tidak bisa "dipinjam lagi" di sini
   - Hanya mahasiswa yang meminjam yang boleh mengembalikan bukunya

   PERUBAHAN:
   Borrow Service sekarang memanggil Book Service secara langsung
   melalui HTTP (fetch bawaan Node.js) saat POST /peminjaman:
     1. GET  {BOOK_SERVICE_URL}/books/:bookId  -> ambil judul & status buku
     2. PATCH {BOOK_SERVICE_URL}/books/:bookId/pinjam -> ubah status jadi "dipinjam"
   Frontend tidak lagi perlu memanggil Book Service sendiri untuk alur pinjam.
   ========================================================= */

const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;
const MAX_ACTIVE_BORROWS = 3;
const BORROW_PERIOD_DAYS = 7;
const BOOK_SERVICE_URL = "http://localhost:3000";

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

/* ---------- Helper: panggil Book Service ----------
   Membungkus fetch + parsing JSON supaya kegagalan jaringan
   (Book Service mati) dan response yang bukan JSON valid
   (mis. Book Service crash dan Express mengembalikan HTML)
   sama-sama tertangani, tidak membuat proses ini crash. */
async function callBookService(path, options) {
  let response;
  try {
    response = await fetch(`${BOOK_SERVICE_URL}${path}`, options);
  } catch (err) {
    const error = new Error("Book Service tidak dapat diakses.");
    error.type = "unreachable";
    throw error;
  }

  let payload;
  try {
    payload = await response.json();
  } catch (err) {
    const error = new Error("Book Service mengembalikan response yang tidak valid.");
    error.type = "invalid_response";
    throw error;
  }

  return { status: response.status, payload };
}

/* ---------- GET /peminjaman ----------
   TIDAK DIUBAH.
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
   Body baru: { studentId, bookId }  (title TIDAK dikirim frontend lagi)

   Alur:
   1. Validasi studentId & bookId ada
   2. GET Book Service /books/:bookId
      - Book Service tidak terjangkau / response bukan JSON valid -> 502
      - 404 dari Book Service                                     -> 404
      - status buku bukan "tersedia"                              -> 400
   3. Cek limit 3 buku aktif per mahasiswa                        -> 400
   4. Cek tidak ada record aktif lain untuk buku yang sama        -> 400
   5. Buat record peminjaman (title dari book.judul)
   6. PATCH Book Service /books/:bookId/pinjam
      - gagal (network / bukan 200)  -> ROLLBACK record, lalu error ke frontend
   7. Berhasil -> 201 dengan record final */
app.post("/peminjaman", async (req, res) => {
  const { studentId, bookId } = req.body;

  if (!studentId || !bookId) {
    return res.status(400).json({ message: "studentId dan bookId wajib diisi." });
  }

  const normalizedStudentId = normalizeStudentId(studentId);

  // --- Ambil data buku dari Book Service ---
  let book;
  try {
    const { status, payload } = await callBookService(`/books/${bookId}`, { method: "GET" });

    if (status === 404) {
      return res.status(404).json({
        message: payload?.message || `Buku dengan id ${bookId} tidak ditemukan.`,
      });
    }

    if (status !== 200) {
      return res.status(502).json({
        message: "Book Service mengembalikan respons yang tidak terduga saat mengambil data buku.",
      });
    }

    book = payload?.data;
    if (!book) {
      return res.status(502).json({
        message: "Book Service mengembalikan data buku yang tidak sesuai format.",
      });
    }
  } catch (err) {
    return res.status(502).json({ message: "Book Service tidak dapat diakses." });
  }

  // Rule: buku harus berstatus "tersedia"
  if (book.status !== "tersedia") {
    return res.status(400).json({
      message: `Buku "${book.judul}" sedang tidak tersedia (status: ${book.status}).`,
    });
  }

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
    title: book.judul,
    borrowDate,
    dueDate,
    status: "active",
  };

  records.push(record);

  // --- Beri tahu Book Service bahwa buku ini sekarang dipinjam ---
  try {
    const { status, payload } = await callBookService(`/books/${bookId}/pinjam`, {
      method: "PATCH",
    });

    if (status !== 200) {
      // ROLLBACK: batalkan record yang baru saja dibuat
      records = records.filter((r) => r.recordId !== record.recordId);

      return res.status(409).json({
        message:
          payload?.message ||
          "Gagal mengubah status buku di Book Service. Peminjaman dibatalkan.",
      });
    }
  } catch (err) {
    // ROLLBACK: Book Service tidak terjangkau setelah record dibuat
    records = records.filter((r) => r.recordId !== record.recordId);

    return res.status(502).json({
      message: "Book Service tidak dapat diakses saat mengubah status buku. Peminjaman dibatalkan.",
    });
  }

  res.status(201).json({ data: record });
});

/* ---------- PATCH /peminjaman/:recordId/kembalikan ----------
   TIDAK DIUBAH.
   Body: { studentId }  → dipakai untuk cek kepemilikan */
app.patch("/peminjaman/:recordId/kembalikan", async (req, res) => {
  const { recordId } = req.params;
  const { studentId } = req.body;

  if (!studentId || typeof studentId !== "string") {
    return res.status(400).json({
      message: "studentId wajib diisi untuk pengembalian.",
    });
  }

  const normalizedStudentId = normalizeStudentId(studentId);
  const record = records.find((r) => r.recordId === recordId);

  if (!record) {
    return res.status(404).json({
      message: "Data peminjaman tidak ditemukan.",
    });
  }

  if (record.status === "returned") {
    return res.status(400).json({
      message: "Buku ini sudah dikembalikan sebelumnya.",
    });
  }

  if (normalizedStudentId !== record.studentId) {
    return res.status(403).json({
      message: "Kamu tidak berhak mengembalikan buku ini.",
    });
  }

  // Ubah status buku di Book Service terlebih dahulu.
  try {
    const { status, payload } = await callBookService(
      `/books/${record.bookId}/kembali`,
      {
        method: "PATCH",
      }
    );

    if (status === 404) {
      return res.status(404).json({
        message:
          payload?.message ||
          `Buku dengan id ${record.bookId} tidak ditemukan.`,
      });
    }

    if (status !== 200) {
      return res.status(409).json({
        message:
          payload?.message ||
          "Status buku gagal diubah. Pengembalian dibatalkan.",
      });
    }
  } catch (err) {
    return res.status(502).json({
      message:
        "Book Service tidak dapat diakses. Pengembalian dibatalkan.",
    });
  }

  // Hanya ubah record setelah Book Service berhasil.
  record.status = "returned";
  record.returnDate = new Date().toISOString();

  res.json({ data: record });
});

app.listen(PORT, () => {
  console.log(`Borrow Service jalan di http://localhost:${PORT}`);
});