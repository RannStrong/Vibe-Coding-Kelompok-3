# Borrow Service — UINSI Library

Folder ini berisi backend Borrow Service dan client browser lama:

- `server.js` dan `routes/peminjaman.js` menjalankan API Borrow Service pada port `3001`.
- `script.js` adalah client frontend yang tetap dimuat oleh `index.html`. Client mengambil katalog dari Book Service `http://localhost:3000` dan transaksi dari Borrow Service `http://localhost:3001`.
- `db.js` menghubungkan service ke MySQL database `uinsi_library`.

Jalankan kedua service dari folder `service/`:

```powershell
npm install
npm start
```

Endpoint utama Borrow Service:

- `GET /health`
- `GET /peminjaman` dan `GET /peminjaman?studentId=S001`
- `POST /peminjaman` dengan body JSON `{ "studentId": "S001", "bookId": 1 }`
- `PATCH /peminjaman/:id/kembalikan` dengan body JSON `{ "studentId": "S001" }`

Saat pinjam atau kembali, backend Borrow Service memanggil Book Service melalui HTTP untuk memperbarui status buku.
