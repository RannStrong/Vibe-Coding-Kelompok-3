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
require("dotenv").config();

const db = require("./db");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;
const MAX_ACTIVE_BORROWS = 3;
const BORROW_PERIOD_DAYS = 7;
const BOOK_SERVICE_URL = "http://localhost:3000";

const API_KEY = process.env.API_KEY;
const BOOK_SERVICE_API_KEY = process.env.BOOK_SERVICE_API_KEY;

app.use((req, res, next) => {
    const apiKey = req.headers["x-api-key"];

    if (!apiKey || apiKey !== API_KEY) {
        return res.status(401).json({
            message: "API Key tidak valid atau tidak ditemukan."
        });
    }

    next();
});

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
        response = await fetch(`${BOOK_SERVICE_URL}${path}`, {
            ...options,
            headers: {
                ...(options?.headers || {}),
                "X-API-Key": BOOK_SERVICE_API_KEY
            }
        });
    } catch (err) {
        const error = new Error("Book Service tidak dapat diakses.");
        error.type = "unreachable";
        throw error;
    }

    let payload;

    try {
        payload = await response.json();
    } catch (err) {
        const error = new Error(
            "Book Service mengembalikan response yang tidak valid."
        );
        error.type = "invalid_response";
        throw error;
    }

    return {
        status: response.status,
        payload
    };
}

/* ---------- GET /peminjaman ----------
   TIDAK DIUBAH.
   Semua record, atau difilter dengan ?studentId=S001
   (dipakai untuk gantikan getRecords() di frontend) */
app.get("/peminjaman", async (req, res) => {
    const { studentId } = req.query;

    try {
        let query = `
            SELECT
                record_id AS recordId,
                student_id AS studentId,
                book_id AS bookId,
                title,
                borrow_date AS borrowDate,
                due_date AS dueDate,
                return_date AS returnDate,
                status
            FROM borrowings
        `;

        let params = [];

        if (studentId) {
            query += " WHERE student_id = ?";
            params.push(normalizeStudentId(studentId));
        }

        query += " ORDER BY id DESC";

        const [rows] = await db.query(query, params);

        res.json({ data: rows });
    } catch (error) {
        console.error("Gagal mengambil data peminjaman:", error.message);

        res.status(500).json({
            message: "Gagal mengambil data peminjaman."
        });
    }
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
        return res.status(400).json({
            message: "studentId dan bookId wajib diisi."
        });
    }

    const normalizedStudentId = normalizeStudentId(studentId);
    const parsedBookId = Number(bookId);

    if (!Number.isInteger(parsedBookId)) {
        return res.status(400).json({
            message: "bookId harus berupa angka."
        });
    }

    // --- Ambil data buku dari Book Service ---
    let book;

    try {
        const { status, payload } = await callBookService(
            `/books/${parsedBookId}`,
            { method: "GET" }
        );

        if (status === 404) {
            return res.status(404).json({
                message:
                    payload?.message ||
                    `Buku dengan id ${parsedBookId} tidak ditemukan.`
            });
        }

        if (status !== 200) {
            return res.status(502).json({
                message:
                    "Book Service mengembalikan respons yang tidak terduga saat mengambil data buku."
            });
        }

        book = payload?.data;

        if (!book) {
            return res.status(502).json({
                message:
                    "Book Service mengembalikan data buku yang tidak sesuai format."
            });
        }
    } catch (err) {
        return res.status(502).json({
            message: "Book Service tidak dapat diakses."
        });
    }

    // Rule: buku harus tersedia
    if (book.status !== "tersedia") {
        return res.status(400).json({
            message:
                `Buku "${book.judul}" sedang tidak tersedia (status: ${book.status}).`
        });
    }

    try {
        // --- Cek jumlah buku aktif mahasiswa ---
        const [activeRows] = await db.query(
            `
            SELECT COUNT(*) AS jumlah
            FROM borrowings
            WHERE student_id = ?
            AND status = 'active'
            `,
            [normalizedStudentId]
        );

        const activeCount = activeRows[0].jumlah;

        if (activeCount >= MAX_ACTIVE_BORROWS) {
            return res.status(400).json({
                message:
                    `Mahasiswa sudah meminjam ${MAX_ACTIVE_BORROWS} buku aktif. Batas maksimum tercapai.`
            });
        }

        // --- Cek apakah buku sudah dipinjam ---
        const [existingRows] = await db.query(
            `
            SELECT record_id
            FROM borrowings
            WHERE book_id = ?
            AND status = 'active'
            LIMIT 1
            `,
            [parsedBookId]
        );

        if (existingRows.length > 0) {
            return res.status(400).json({
                message: "Buku ini sudah tercatat sedang dipinjam."
            });
        }

        // --- Buat tanggal peminjaman ---
        const borrowDate = new Date();
        const dueDate = new Date(borrowDate);

        dueDate.setDate(
            dueDate.getDate() + BORROW_PERIOD_DAYS
        );

        // ID transaksi
        const recordId = `R${Date.now()}`;

        // --- Simpan ke MySQL ---
        await db.query(
            `
            INSERT INTO borrowings
            (
                record_id,
                student_id,
                book_id,
                title,
                borrow_date,
                due_date,
                status
            )
            VALUES (?, ?, ?, ?, ?, ?, 'active')
            `,
            [
                recordId,
                normalizedStudentId,
                parsedBookId,
                book.judul,
                borrowDate,
                dueDate
            ]
        );

        // --- Ubah status buku di Book Service ---
        try {
            const { status, payload } = await callBookService(
                `/books/${parsedBookId}/pinjam`,
                {
                    method: "PATCH"
                }
            );

            if (status !== 200) {
                // ROLLBACK database
                await db.query(
                    "DELETE FROM borrowings WHERE record_id = ?",
                    [recordId]
                );

                return res.status(409).json({
                    message:
                        payload?.message ||
                        "Gagal mengubah status buku di Book Service. Peminjaman dibatalkan."
                });
            }
        } catch (err) {
            // ROLLBACK database
            await db.query(
                "DELETE FROM borrowings WHERE record_id = ?",
                [recordId]
            );

            return res.status(502).json({
                message:
                    "Book Service tidak dapat diakses saat mengubah status buku. Peminjaman dibatalkan."
            });
        }

        // --- Ambil kembali data yang baru dibuat ---
        const [rows] = await db.query(
            `
            SELECT
                record_id AS recordId,
                student_id AS studentId,
                book_id AS bookId,
                title,
                borrow_date AS borrowDate,
                due_date AS dueDate,
                return_date AS returnDate,
                status
            FROM borrowings
            WHERE record_id = ?
            `,
            [recordId]
        );

        res.status(201).json({
            data: rows[0]
        });

    } catch (error) {
        console.error(
            "Gagal membuat peminjaman:",
            error.message
        );

        res.status(500).json({
            message: "Gagal menyimpan data peminjaman."
        });
    }
});

/* ---------- PATCH /peminjaman/:recordId/kembalikan ----------
   TIDAK DIUBAH.
   Body: { studentId }  → dipakai untuk cek kepemilikan */
app.patch("/peminjaman/:recordId/kembalikan", async (req, res) => {
    const { recordId } = req.params;
    const { studentId } = req.body;

    if (!studentId || typeof studentId !== "string") {
        return res.status(400).json({
            message: "studentId wajib diisi untuk pengembalian."
        });
    }

    const normalizedStudentId = normalizeStudentId(studentId);

    try {
        // Cari data peminjaman di MySQL
        const [rows] = await db.query(
            `
            SELECT
                record_id AS recordId,
                student_id AS studentId,
                book_id AS bookId,
                title,
                borrow_date AS borrowDate,
                due_date AS dueDate,
                return_date AS returnDate,
                status
            FROM borrowings
            WHERE record_id = ?
            LIMIT 1
            `,
            [recordId]
        );

        if (rows.length === 0) {
            return res.status(404).json({
                message: "Data peminjaman tidak ditemukan."
            });
        }

        const record = rows[0];

        // Cek apakah sudah dikembalikan
        if (record.status === "returned") {
            return res.status(400).json({
                message: "Buku ini sudah dikembalikan sebelumnya."
            });
        }

        // Cek apakah mahasiswa yang mengembalikan adalah peminjam
        if (normalizedStudentId !== record.studentId) {
            return res.status(403).json({
                message: "Kamu tidak berhak mengembalikan buku ini."
            });
        }

        // --- Ubah status buku di Book Service ---
        try {
            const { status, payload } = await callBookService(
                `/books/${record.bookId}/kembali`,
                {
                    method: "PATCH"
                }
            );

            if (status === 404) {
                return res.status(404).json({
                    message:
                        payload?.message ||
                        `Buku dengan id ${record.bookId} tidak ditemukan.`
                });
            }

            if (status !== 200) {
                return res.status(409).json({
                    message:
                        payload?.message ||
                        "Status buku gagal diubah. Pengembalian dibatalkan."
                });
            }
        } catch (err) {
            return res.status(502).json({
                message:
                    "Book Service tidak dapat diakses. Pengembalian dibatalkan."
            });
        }

        // --- Update data peminjaman di MySQL ---
        const returnDate = new Date();

        await db.query(
            `
            UPDATE borrowings
            SET status = 'returned',
                return_date = ?
            WHERE record_id = ?
            `,
            [returnDate, recordId]
        );

        // Ambil data terbaru
        const [updatedRows] = await db.query(
            `
            SELECT
                record_id AS recordId,
                student_id AS studentId,
                book_id AS bookId,
                title,
                borrow_date AS borrowDate,
                due_date AS dueDate,
                return_date AS returnDate,
                status
            FROM borrowings
            WHERE record_id = ?
            LIMIT 1
            `,
            [recordId]
        );

        res.json({
            data: updatedRows[0]
        });

    } catch (error) {
        console.error(
            "Gagal mengembalikan buku:",
            error.message
        );

        res.status(500).json({
            message: "Gagal memproses pengembalian buku."
        });
    }
});

app.listen(PORT, () => {
  console.log(`Borrow Service jalan di http://localhost:${PORT}`);
});