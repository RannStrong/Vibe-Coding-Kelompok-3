const { randomBytes } = require("crypto");
const express = require("express");
const db = require("../db");

const router = express.Router();
const MAX_ACTIVE_BORROWS = 3;
const BORROW_PERIOD_DAYS = 7;
const BOOK_SERVICE_URL = process.env.BOOK_SERVICE_URL || "http://localhost:3000";
const asyncRoute = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);

class BookServiceError extends Error {
  constructor(message, statusCode = 503) {
    super(message);
    this.statusCode = statusCode;
  }
}

function normalizeStudentId(id) {
  return String(id || "").trim().toUpperCase();
}

function toMysqlDatetime(date) {
  return date.toISOString().slice(0, 19).replace("T", " ");
}

function toIsoDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  return new Date(`${String(value).replace(" ", "T")}Z`).toISOString();
}

function mapRecord(row) {
  const record = {
    id: row.id,
    recordId: row.record_id,
    studentId: row.student_id,
    bookId: row.book_id,
    title: row.judul,
    borrowDate: toIsoDate(row.tanggal_pinjam),
    dueDate: toIsoDate(row.tanggal_jatuh_tempo),
    status: row.status,
  };
  if (row.tanggal_kembali) record.returnDate = toIsoDate(row.tanggal_kembali);
  return record;
}

function createRecordId() {
  return `R${Date.now().toString(36).toUpperCase()}${randomBytes(5).toString("hex").toUpperCase()}`;
}

async function callBookService(bookId, action) {
  let response;
  try {
    response = await fetch(`${BOOK_SERVICE_URL}/books/${bookId}${action}`, {
      method: action ? "PATCH" : "GET",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(5000),
    });
  } catch (error) {
    throw new BookServiceError(`Book Service tidak dapat dihubungi: ${error.message}`);
  }

  let body;
  try {
    body = await response.json();
  } catch {
    throw new BookServiceError("Book Service mengirim respons yang tidak valid.");
  }
  if (!response.ok) {
    throw new BookServiceError(
      body.message || "Permintaan ke Book Service gagal.",
      response.status === 404 ? 404 : response.status >= 500 ? 503 : response.status
    );
  }
  return body.data;
}

async function compensateBookStatus(bookId, action) {
  try {
    await callBookService(bookId, action);
  } catch (error) {
    console.error(`Kompensasi status buku ${bookId} gagal:`, error.message);
  }
}

router.get("/", asyncRoute(async (req, res) => {
  const studentId = req.query.studentId
    ? normalizeStudentId(req.query.studentId)
    : null;
  const [rows] = studentId
    ? await db.execute(
      `SELECT p.id, p.record_id, m.student_id, p.buku_id AS book_id, b.judul,
        p.tanggal_pinjam, p.tanggal_jatuh_tempo, p.tanggal_kembali, p.status
      FROM peminjaman p
      JOIN mahasiswa m ON m.id = p.mahasiswa_id
      JOIN buku b ON b.id = p.buku_id
      WHERE m.student_id = ? ORDER BY p.id DESC`,
      [studentId]
    )
    : await db.execute(
      `SELECT p.id, p.record_id, m.student_id, p.buku_id AS book_id, b.judul,
        p.tanggal_pinjam, p.tanggal_jatuh_tempo, p.tanggal_kembali, p.status
      FROM peminjaman p
      JOIN mahasiswa m ON m.id = p.mahasiswa_id
      JOIN buku b ON b.id = p.buku_id
      ORDER BY p.id DESC`
    );
  res.json({ data: rows.map(mapRecord) });
}));

router.post("/", asyncRoute(async (req, res) => {
  const { studentId, bookId } = req.body;
  const normalizedStudentId = normalizeStudentId(studentId);
  const numericBookId = Number(bookId);
  if (!normalizedStudentId || !Number.isInteger(numericBookId) || numericBookId <= 0) {
    return res.status(400).json({ message: "studentId dan bookId yang valid wajib diisi." });
  }

  const connection = await db.getConnection();
  let transactionOpen = false;
  let bookReserved = false;
  try {
    await connection.beginTransaction();
    transactionOpen = true;

    const [students] = await connection.execute(
      "SELECT id, student_id FROM mahasiswa WHERE student_id = ? FOR UPDATE",
      [normalizedStudentId]
    );
    const student = students[0];
    if (!student) {
      await connection.rollback();
      transactionOpen = false;
      return res.status(404).json({ message: "Mahasiswa tidak ditemukan." });
    }

    const [activeCounts] = await connection.execute(
      "SELECT COUNT(*) AS total FROM peminjaman WHERE mahasiswa_id = ? AND status = 'active'",
      [student.id]
    );
    if (Number(activeCounts[0].total) >= MAX_ACTIVE_BORROWS) {
      await connection.rollback();
      transactionOpen = false;
      return res.status(400).json({
        message: `Mahasiswa sudah meminjam ${MAX_ACTIVE_BORROWS} buku aktif. Batas maksimum tercapai.`,
      });
    }

    const book = await callBookService(numericBookId, "");
    if (book.status !== "tersedia") {
      await connection.rollback();
      transactionOpen = false;
      return res.status(409).json({
        message: `Buku "${book.judul}" sedang tidak tersedia (status: ${book.status}).`,
      });
    }

    const [activeBorrowings] = await connection.execute(
      "SELECT id FROM peminjaman WHERE buku_id = ? AND status = 'active' LIMIT 1",
      [numericBookId]
    );
    if (activeBorrowings.length > 0) {
      await connection.rollback();
      transactionOpen = false;
      return res.status(409).json({ message: "Buku ini masih memiliki peminjaman aktif." });
    }

    await callBookService(numericBookId, "/borrow");
    bookReserved = true;

    const borrowDate = new Date();
    const dueDate = new Date(borrowDate);
    dueDate.setUTCDate(dueDate.getUTCDate() + BORROW_PERIOD_DAYS);
    const recordId = createRecordId();
    const [result] = await connection.execute(
      `INSERT INTO peminjaman
        (record_id, mahasiswa_id, buku_id, tanggal_pinjam, tanggal_jatuh_tempo, status)
      VALUES (?, ?, ?, ?, ?, 'active')`,
      [recordId, student.id, numericBookId, toMysqlDatetime(borrowDate), toMysqlDatetime(dueDate)]
    );
    await connection.commit();
    transactionOpen = false;

    res.status(201).json({
      data: {
        id: result.insertId,
        recordId,
        studentId: student.student_id,
        bookId: numericBookId,
        title: book.judul,
        borrowDate: borrowDate.toISOString(),
        dueDate: dueDate.toISOString(),
        status: "active",
      },
    });
  } catch (error) {
    if (transactionOpen) await connection.rollback();
    if (bookReserved) await compensateBookStatus(numericBookId, "/return");
    throw error;
  } finally {
    connection.release();
  }
}));

router.patch("/:id/kembalikan", asyncRoute(async (req, res) => {
  const routeId = String(req.params.id);
  const { studentId } = req.body;
  if (typeof studentId !== "string" || !studentId.trim()) {
    return res.status(400).json({ message: "studentId wajib diisi untuk pengembalian." });
  }

  const connection = await db.getConnection();
  let transactionOpen = false;
  let bookReturned = false;
  let bookId;
  try {
    await connection.beginTransaction();
    transactionOpen = true;
    const [lockedRows] = await connection.execute(
      "SELECT id FROM peminjaman WHERE record_id = ? OR id = ? FOR UPDATE",
      [routeId, /^\d+$/.test(routeId) ? Number(routeId) : -1]
    );
    if (!lockedRows[0]) {
      await connection.rollback();
      transactionOpen = false;
      return res.status(404).json({ message: "Data peminjaman tidak ditemukan." });
    }
    const [rows] = await connection.execute(
      `SELECT p.id, p.record_id, p.buku_id AS book_id, p.tanggal_pinjam,
        p.tanggal_jatuh_tempo, p.tanggal_kembali, p.status,
        m.student_id, b.judul, b.status AS book_status
      FROM peminjaman p
      JOIN mahasiswa m ON m.id = p.mahasiswa_id
      JOIN buku b ON b.id = p.buku_id
      WHERE p.id = ?`,
      [lockedRows[0].id]
    );
    const row = rows[0];
    if (row.status === "returned") {
      await connection.rollback();
      transactionOpen = false;
      return res.status(400).json({ message: "Buku ini sudah dikembalikan sebelumnya." });
    }
    if (normalizeStudentId(studentId) !== row.student_id) {
      await connection.rollback();
      transactionOpen = false;
      return res.status(403).json({ message: "Kamu tidak berhak mengembalikan buku ini." });
    }
    if (row.book_status !== "dipinjam") {
      await connection.rollback();
      transactionOpen = false;
      return res.status(409).json({ message: "Status buku tidak cocok dengan data peminjaman." });
    }

    bookId = row.book_id;
    await callBookService(bookId, "/return");
    bookReturned = true;
    const returnDate = new Date();
    const [result] = await connection.execute(
      `UPDATE peminjaman SET status = 'returned', tanggal_kembali = ?
      WHERE record_id = ? AND status = 'active'`,
      [toMysqlDatetime(returnDate), row.record_id]
    );
    if (result.affectedRows !== 1) {
      throw new Error("Status peminjaman berubah sebelum pengembalian tersimpan.");
    }
    await connection.commit();
    transactionOpen = false;

    res.json({ data: { ...mapRecord(row), status: "returned", returnDate: returnDate.toISOString() } });
  } catch (error) {
    if (transactionOpen) await connection.rollback();
    if (bookReturned) await compensateBookStatus(bookId, "/borrow");
    throw error;
  } finally {
    connection.release();
  }
}));

module.exports = router;