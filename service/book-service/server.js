const express = require("express");
const cors = require("cors");
const db = require("./db");
const bookRoutes = require("./routes/books");

const app = express();
const PORT = Number(process.env.BOOK_SERVICE_PORT || 3000);

app.use(cors());
app.use(express.json());

app.get("/health", async (req, res, next) => {
  try {
    await db.query("SELECT 1");
    res.json({ status: "ok", service: "book-service", database: "connected" });
  } catch (error) {
    next(error);
  }
});
app.use("/books", bookRoutes);
app.use((req, res) => {
  res.status(404).json({ message: "Endpoint tidak ditemukan." });
});
app.use((error, req, res, next) => {
  console.error(error);
  if (res.headersSent) return next(error);
  res.status(error.statusCode || 500).json({
    message: error.statusCode ? error.message : "Terjadi kesalahan pada server.",
  });
});

app.listen(PORT, () => {
  console.log(`Book Service berjalan di http://localhost:${PORT}`);
});