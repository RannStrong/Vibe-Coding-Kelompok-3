const express = require("express");
const db = require("../db");

const router = express.Router();
const asyncRoute = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);

function parseBookId(rawId, res) {
  const id = Number.parseInt(rawId, 10);
  if (!Number.isInteger(id) || id <= 0) {
    res.status(400).json({ message: "id harus berupa angka positif" });
    return null;
  }
  return id;
}

async function getBook(id) {
  const [rows] = await db.execute(
    "SELECT id, judul, penulis, tahun, status FROM buku WHERE id = ?",
    [id]
  );
  return rows[0] || null;
}

router.get("/available", asyncRoute(async (req, res) => {
  const [books] = await db.execute(
    "SELECT id, judul, penulis, tahun, status FROM buku WHERE status = 'tersedia' ORDER BY id"
  );
  res.json({ total: books.length, data: books });
}));

router.get("/", asyncRoute(async (req, res) => {
  const [books] = await db.execute(
    "SELECT id, judul, penulis, tahun, status FROM buku ORDER BY id"
  );
  res.json({ total: books.length, data: books });
}));

router.get("/:id", asyncRoute(async (req, res) => {
  const id = parseBookId(req.params.id, res);
  if (id === null) return;

  const book = await getBook(id);
  if (!book) {
    return res.status(404).json({ message: `Buku dengan id ${id} tidak ditemukan` });
  }
  res.json({ data: book });
}));

router.post("/", asyncRoute(async (req, res) => {
  const { judul, penulis, tahun } = req.body;
  if (typeof judul !== "string" || !judul.trim()) {
    return res.status(400).json({ message: "judul wajib diisi dan berupa teks" });
  }
  if (typeof penulis !== "string" || !penulis.trim()) {
    return res.status(400).json({ message: "penulis wajib diisi dan berupa teks" });
  }
  if (tahun !== undefined && (typeof tahun !== "number" || !Number.isInteger(tahun))) {
    return res.status(400).json({ message: "tahun harus berupa angka" });
  }

  const [result] = await db.execute(
    "INSERT INTO buku (judul, penulis, tahun, status) VALUES (?, ?, ?, 'tersedia')",
    [judul.trim(), penulis.trim(), tahun ?? null]
  );
  const book = await getBook(result.insertId);
  res.status(201).json({ message: `Buku "${book.judul}" berhasil ditambahkan`, data: book });
}));

router.delete("/:id", asyncRoute(async (req, res) => {
  const id = parseBookId(req.params.id, res);
  if (id === null) return;

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [books] = await connection.execute(
      "SELECT id, judul, status FROM buku WHERE id = ? FOR UPDATE",
      [id]
    );
    const book = books[0];
    if (!book) {
      await connection.rollback();
      return res.status(404).json({ message: `Buku dengan id ${id} tidak ditemukan` });
    }
    if (book.status === "dipinjam") {
      await connection.rollback();
      return res.status(400).json({
        message: "Buku yang sedang dipinjam tidak bisa dihapus. Tunggu sampai dikembalikan.",
      });
    }

    const [borrowings] = await connection.execute(
      "SELECT COUNT(*) AS total FROM peminjaman WHERE buku_id = ?",
      [id]
    );
    if (borrowings[0].total > 0) {
      await connection.rollback();
      return res.status(409).json({
        message: "Buku yang memiliki riwayat peminjaman tidak bisa dihapus.",
      });
    }

    await connection.execute("DELETE FROM buku WHERE id = ?", [id]);
    await connection.commit();
    res.json({ message: `Buku "${book.judul}" berhasil dihapus` });
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}));

async function updateBookStatus(req, res, expectedStatus, nextStatus) {
  const id = parseBookId(req.params.id, res);
  if (id === null) return;

  const [result] = await db.execute(
    "UPDATE buku SET status = ? WHERE id = ? AND status = ?",
    [nextStatus, id, expectedStatus]
  );
  if (result.affectedRows === 0) {
    const book = await getBook(id);
    if (!book) {
      return res.status(404).json({ message: `Buku dengan id ${id} tidak ditemukan` });
    }
    return res.status(409).json({ message: `Buku ini sudah dalam status ${book.status}` });
  }

  const book = await getBook(id);
  res.json({
    message: `Buku "${book.judul}" berhasil diubah menjadi ${nextStatus}`,
    data: book,
  });
}

router.patch("/:id/borrow", asyncRoute((req, res) =>
  updateBookStatus(req, res, "tersedia", "dipinjam")
));
router.patch("/:id/return", asyncRoute((req, res) =>
  updateBookStatus(req, res, "dipinjam", "tersedia")
));
router.patch("/:id/pinjam", asyncRoute((req, res) =>
  updateBookStatus(req, res, "tersedia", "dipinjam")
));
router.patch("/:id/kembali", asyncRoute((req, res) =>
  updateBookStatus(req, res, "dipinjam", "tersedia")
));

module.exports = router;