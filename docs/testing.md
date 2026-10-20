# Testing

## Start the API

```powershell
cd service
npm install
# Pengujian

## Setup

Pastikan MySQL berjalan dan database `uinsi_library` sudah diimpor dari `uinsi_library.sql`. Dari folder `service/`:

```powershell
npm install
npm start
```

Jika kredensial berbeda, salin `.env.example` menjadi `.env` di folder `service/` dan sesuaikan `DB_HOST`, `DB_PORT`, `DB_DATABASE`, `DB_USERNAME`, dan `DB_PASSWORD`.

## Urutan Postman

1. `GET http://localhost:3000/health` harus mengembalikan `status: "ok"` dan `database: "connected"`.
2. `GET http://localhost:3001/health` harus mengembalikan `status: "ok"` dan `database: "connected"`.
3. Periksa `GET http://localhost:3000/books`, pilih ID buku berstatus `tersedia`.
4. Periksa `GET http://localhost:3001/peminjaman` atau filter dengan `?studentId=S001`.
5. Kirim `POST http://localhost:3001/peminjaman` dengan JSON `{"studentId":"S001","bookId":5}` (ganti ID dengan buku tersedia). Simpan `data.recordId`.
6. Verifikasi transaksi melalui `GET /peminjaman?studentId=S001`, lalu `GET http://localhost:3000/books/1`. Status buku harus `dipinjam`, membuktikan komunikasi Borrow Service ke Book Service.
7. Kirim `PATCH http://localhost:3001/peminjaman/{{recordId}}/kembalikan` dengan JSON `{"studentId":"S001"}`. Status transaksi harus `returned` dan status buku kembali `tersedia`.

## Kasus Aturan Bisnis

- POST dengan `studentId` yang tidak terdaftar ditolak.
- POST untuk buku yang sudah dipinjam ditolak dan status buku tidak berubah.
- POST keempat bagi mahasiswa dengan tiga transaksi aktif ditolak.
- Pengembalian memakai ID mahasiswa lain ditolak.
- Pengembalian kedua atas transaksi sama ditolak.
- Borrow Service tanpa Book Service yang tersedia mengembalikan error upstream, bukan menulis transaksi sukses.

## Hasil Verifikasi Lokal

Hasil pengujian workspace ini:

| Pengujian | Hasil |
|---|---|
| Newman menjalankan Postman collection | PASS; 9 request, 9 assertion, 0 gagal |
| `npm install` dan `npm start` dari `service/` | PASS; kedua service listen di port `3000` dan `3001` |
| Kedua endpoint `/health` | PASS; keduanya melaporkan `database: connected` |
| `GET /books`, `GET /books/:id`, `GET /peminjaman`, dan filter `studentId` | PASS |
| POST peminjaman dan perubahan status melalui Book Service | PASS; status diamati berubah menjadi `dipinjam` |
| PATCH pengembalian dan status buku kembali tersedia | PASS |
| Mahasiswa tidak terdaftar, batas tiga aktif, buku tidak tersedia | PASS; ditolak dengan status `404`, `400`, dan `409` |
| Kepemilikan pengembalian dan return ganda | PASS; ditolak dengan status `403` dan `400` |
| Frontend browser S003 meminjam lalu mengembalikan buku | PASS; POST `201`, PATCH `200`, baris pinjaman hilang dari UI |
| `npm audit` | PASS; 0 vulnerability setelah override `shell-quote` |

### Temuan dan Perbaikan

- Pengembalian awal mengalami deadlock karena query `JOIN ... FOR UPDATE` turut mengunci baris buku yang harus diubah Book Service. Lock kini hanya diterapkan pada record peminjaman sebelum data terkait dibaca; alur return end-to-end berhasil.
- Database lokal memiliki transaksi aktif lama untuk buku 1, tetapi status buku saat tes awal `tersedia`. Borrow Service kini juga memeriksa transaksi aktif di tabel `peminjaman` sebelum membuat pinjaman baru. Status buku 1 diselaraskan menjadi `dipinjam` melalui endpoint Book Service; transaksi lama dipertahankan.