// ========================================================
// BOOK SERVICE
// REST API untuk mengelola data buku perpustakaan
// Penyimpanan data: MySQL
// ========================================================
require("dotenv").config();

const express = require("express");
const db = require("./db");

const app = express();
const PORT = 3000;

const API_KEY = process.env.API_KEY;

function cekApiKey(req, res, next) {
  const apiKey = req.headers["x-api-key"];

  if (!apiKey || apiKey !== API_KEY) {
    return res.status(401).json({
      message: "API Key tidak valid atau tidak ditemukan"
    });
  }

  next();
}

// Supaya Express bisa membaca body JSON
app.use(express.json());

// --------------------------------------------------------
// CORS
// --------------------------------------------------------

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Methods",
    "GET, POST, PATCH, PUT, DELETE, OPTIONS"
  );
  res.header("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }

  next();
});

// --------------------------------------------------------
// GET /books
// Menampilkan semua buku
// --------------------------------------------------------

app.get("/books", cekApiKey, async (req, res) => {
  try {
    const [books] = await db.query("SELECT * FROM books");

    res.json({
      total: books.length,
      data: books,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Gagal mengambil data buku",
    });
  }
});

// --------------------------------------------------------
// GET /books/available
// Menampilkan buku yang tersedia
// --------------------------------------------------------

app.get("/books/available", cekApiKey, async (req, res) => {
  try {
    const [books] = await db.query(
      "SELECT * FROM books WHERE status = ?",
      ["tersedia"]
    );

    res.json({
      total: books.length,
      data: books,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Gagal mengambil buku yang tersedia",
    });
  }
});

// --------------------------------------------------------
// GET /books/:id
// Mengambil satu buku berdasarkan ID
// --------------------------------------------------------

app.get("/books/:id", cekApiKey, async (req, res) => {
  const id = parseInt(req.params.id);

  if (Number.isNaN(id)) {
    return res.status(400).json({
      message: "id harus berupa angka",
    });
  }

  try {
    const [books] = await db.query(
      "SELECT * FROM books WHERE id = ?",
      [id]
    );

    if (books.length === 0) {
      return res.status(404).json({
        message: `Buku dengan id ${id} tidak ditemukan`,
      });
    }

    res.json({
      data: books[0],
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Gagal mengambil data buku",
    });
  }
});

// --------------------------------------------------------
// POST /books
// Menambahkan buku baru
// --------------------------------------------------------

app.post("/books", cekApiKey, async (req, res) => {
  const { judul, penulis, tahun } = req.body;

  if (!judul || typeof judul !== "string" || judul.trim() === "") {
    return res.status(400).json({
      message: "judul wajib diisi dan berupa teks",
    });
  }

  if (
    !penulis ||
    typeof penulis !== "string" ||
    penulis.trim() === ""
  ) {
    return res.status(400).json({
      message: "penulis wajib diisi dan berupa teks",
    });
  }

  if (
    tahun !== undefined &&
    tahun !== null &&
    (typeof tahun !== "number" || !Number.isInteger(tahun))
  ) {
    return res.status(400).json({
      message: "tahun harus berupa angka",
    });
  }

  try {
    const [result] = await db.query(
      `INSERT INTO books (judul, penulis, tahun, status)
       VALUES (?, ?, ?, ?)`,
      [
        judul.trim(),
        penulis.trim(),
        tahun ?? null,
        "tersedia",
      ]
    );

    const [books] = await db.query(
      "SELECT * FROM books WHERE id = ?",
      [result.insertId]
    );

    res.status(201).json({
      message: `Buku "${judul.trim()}" berhasil ditambahkan`,
      data: books[0],
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Gagal menambahkan buku",
    });
  }
});

// --------------------------------------------------------
// DELETE /books/:id
// Menghapus buku
// --------------------------------------------------------

app.delete("/books/:id", cekApiKey, async (req, res) => {
  const id = parseInt(req.params.id);

  if (Number.isNaN(id)) {
    return res.status(400).json({
      message: "id harus berupa angka",
    });
  }

  try {
    const [books] = await db.query(
      "SELECT * FROM books WHERE id = ?",
      [id]
    );

    if (books.length === 0) {
      return res.status(404).json({
        message: `Buku dengan id ${id} tidak ditemukan`,
      });
    }

    const buku = books[0];

    if (buku.status === "dipinjam") {
      return res.status(400).json({
        message:
          "Buku yang sedang dipinjam tidak bisa dihapus. Tunggu sampai dikembalikan.",
      });
    }

    await db.query(
      "DELETE FROM books WHERE id = ?",
      [id]
    );

    res.json({
      message: `Buku "${buku.judul}" berhasil dihapus`,
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Gagal menghapus buku",
    });
  }
});

// --------------------------------------------------------
// PATCH /books/:id/pinjam
// Mengubah status menjadi dipinjam
// --------------------------------------------------------

app.patch("/books/:id/pinjam", cekApiKey, async (req, res) => {
  const id = parseInt(req.params.id);

  if (Number.isNaN(id)) {
    return res.status(400).json({
      message: "id harus berupa angka",
    });
  }

  try {
    const [books] = await db.query(
      "SELECT * FROM books WHERE id = ?",
      [id]
    );

    if (books.length === 0) {
      return res.status(404).json({
        message: `Buku dengan id ${id} tidak ditemukan`,
      });
    }

    const buku = books[0];

    if (buku.status === "dipinjam") {
      return res.status(400).json({
        message: "Buku ini sudah dalam status dipinjam",
      });
    }

    await db.query(
      "UPDATE books SET status = ? WHERE id = ?",
      ["dipinjam", id]
    );

    const [updatedBooks] = await db.query(
      "SELECT * FROM books WHERE id = ?",
      [id]
    );

    res.json({
      message: `Buku "${buku.judul}" berhasil diubah menjadi dipinjam`,
      data: updatedBooks[0],
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Gagal mengubah status buku",
    });
  }
});

// --------------------------------------------------------
// PATCH /books/:id/kembali
// Mengubah status menjadi tersedia
// --------------------------------------------------------

app.patch("/books/:id/kembali", cekApiKey, async (req, res) => {
  const id = parseInt(req.params.id);

  if (Number.isNaN(id)) {
    return res.status(400).json({
      message: "id harus berupa angka",
    });
  }

  try {
    const [books] = await db.query(
      "SELECT * FROM books WHERE id = ?",
      [id]
    );

    if (books.length === 0) {
      return res.status(404).json({
        message: `Buku dengan id ${id} tidak ditemukan`,
      });
    }

    const buku = books[0];

    if (buku.status === "tersedia") {
      return res.status(400).json({
        message: "Buku ini sudah dalam status tersedia",
      });
    }

    await db.query(
      "UPDATE books SET status = ? WHERE id = ?",
      ["tersedia", id]
    );

    const [updatedBooks] = await db.query(
      "SELECT * FROM books WHERE id = ?",
      [id]
    );

    res.json({
      message: `Buku "${buku.judul}" berhasil diubah menjadi tersedia`,
      data: updatedBooks[0],
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "Gagal mengubah status buku",
    });
  }
});

// --------------------------------------------------------
// 404
// --------------------------------------------------------

app.use((req, res) => {
  res.status(404).json({
    message: "Endpoint tidak ditemukan. Coba /books",
  });
});

// --------------------------------------------------------
// Menjalankan server
// --------------------------------------------------------

app.listen(PORT, () => {
  console.log(
    `Book Service berjalan di http://localhost:${PORT}`
  );
});