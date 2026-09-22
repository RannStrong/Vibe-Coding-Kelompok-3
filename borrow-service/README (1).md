# Borrow Service — UINSI Library

Mengelola data peminjaman (siapa meminjam buku apa, kapan jatuh tempo, dan proses pengembalian). Berjalan terpisah dari Book Service, dan berkomunikasi dengan frontend lewat API JSON — pola responsnya sengaja disamakan dengan Book Service (`{ data: ... }` untuk sukses, `{ message: ... }` untuk error).

## Cara Menjalankan

```bash
cd borrow-service
npm install
npm start
```

Defaultnya jalan di `http://localhost:3001`. Ganti port lewat variabel environment `PORT` kalau bentrok dengan service lain.

## Aturan Bisnis

- Maksimal **3 buku aktif** dipinjam per mahasiswa
- Masa pinjam **7 hari** dari tanggal pinjam
- Satu buku tidak boleh punya dua record peminjaman aktif sekaligus
- Hanya mahasiswa yang meminjam yang boleh mengembalikan bukunya sendiri

## Endpoint API

**GET /peminjaman**
Semua record peminjaman. Bisa difilter: `GET /peminjaman?studentId=S001`

**POST /peminjaman**
Buat record peminjaman baru.
```json
{ "studentId": "S001", "bookId": "B002", "title": "Clean Code" }
```
Response 201: `{ "data": { "recordId": "R1", "studentId": "S001", "bookId": "B002", "title": "Clean Code", "borrowDate": "...", "dueDate": "...", "status": "active" } }`

Response 400 kalau mahasiswa sudah punya 3 peminjaman aktif, atau buku itu sudah tercatat dipinjam.

**PATCH /peminjaman/:recordId/kembalikan**
Proses pengembalian.
```json
{ "studentId": "S001" }
```
Response 200: record dengan `status: "returned"`.
Response 403 kalau `studentId` yang mengembalikan bukan pemilik record.
Response 404 kalau record tidak ditemukan.
Response 400 kalau sudah pernah dikembalikan.

## Integrasi dengan Frontend & Book Service

Di `script.js`, alur `handleBorrow()` dan `handleReturn()` yang sekarang baca-tulis `localStorage` untuk `records` perlu diganti supaya:

1. **Pinjam buku**: setelah `pinjamBukuDiService(bookId)` (ke Book Service) berhasil → panggil `POST http://localhost:3001/peminjaman` dengan `{ studentId, bookId, title }`.
2. **Kembalikan buku**: sebelum (atau sesudah) `kembalikanBukuDiService(bookId)` (ke Book Service) → panggil `PATCH http://localhost:3001/peminjaman/{recordId}/kembalikan` dengan `{ studentId }`.
3. Fungsi `countActiveBorrowsForStudent()` dan `renderBorrowedTable()` di frontend perlu ambil data dari `GET /peminjaman?studentId=...` alih-alih `getRecords()`.

Lihat file `script.js` yang sudah disesuaikan — perubahan persisnya ada di bagian "12. Borrowing".
