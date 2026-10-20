# Architecture
# Arsitektur Microservice

## Komponen

Project menggunakan dua backend Node.js + Express yang berjalan terpisah, dengan frontend lama tetap dipertahankan.

| Service | Port | Kepemilikan data dan fungsi |
|---|---:|---|
| Book Service | `3000` | Katalog, detail, dan status buku pada tabel `buku` |
| Borrow Service | `3001` | Peminjaman, pengembalian, validasi mahasiswa, dan riwayat pada `mahasiswa` serta `peminjaman` |

Keduanya menggunakan MySQL `uinsi_library` melalui `mysql2`. Konfigurasi dibaca dari `service/.env`; contoh tersedia di `service/.env.example`. Tabel yang digunakan adalah `buku`, `mahasiswa`, dan `peminjaman`. View `v_peminjaman_lengkap` ada pada dump database namun API membaca tabel melalui join. JSON dan array memory bukan penyimpanan utama.

## Komunikasi

Frontend mengambil katalog dari Book Service dan transaksi dari Borrow Service. Pada peminjaman, Borrow Service memvalidasi mahasiswa serta batas peminjaman, meminta detail buku melalui `GET /books/:id`, lalu mengubah status melalui `PATCH /books/:id/borrow`. Setelah itu transaksi disimpan ke MySQL. Pada pengembalian, Borrow Service memvalidasi pemilik dan status transaksi, memanggil `PATCH /books/:id/return`, kemudian menandai transaksi returned. Jika penyimpanan lokal gagal setelah perubahan status remote, Borrow Service mencoba kompensasi dengan memulihkan status buku.

```text
Browser -- katalog/status --> Book Service :3000 --+
   |                                             |
   `-- transaksi --> Borrow Service :3001 --HTTP-+--> Book Service
                            |                         |
                            +-------- MySQL -----------+
```

Status buku hanya diubah melalui API Book Service saat proses borrow/return dari Borrow Service; status tidak diubah langsung oleh route peminjaman. Perubahan status memakai conditional update supaya buku yang sudah dipinjam tidak dapat dipinjam lagi.

## Endpoint

### Book Service (`http://localhost:3000`)

| Method | Path | Keterangan |
|---|---|---|
| GET | `/health` | Memeriksa service dan koneksi MySQL |
| GET | `/books` | Daftar buku |
| GET | `/books/available` | Buku yang tersedia |
| GET | `/books/:id` | Detail buku |
| PATCH | `/books/:id/borrow` | `tersedia` menjadi `dipinjam` |
| PATCH | `/books/:id/return` | `dipinjam` menjadi `tersedia` |
| POST | `/books` | Tambah buku |
| DELETE | `/books/:id` | Hapus jika tidak dipinjam/tidak punya riwayat |

### Borrow Service (`http://localhost:3001`)

| Method | Path | Keterangan |
|---|---|---|
| GET | `/health` | Memeriksa service dan koneksi MySQL |
| GET | `/peminjaman` | Semua transaksi |
| GET | `/peminjaman?studentId=S001` | Filter transaksi mahasiswa |
| POST | `/peminjaman` | Body `studentId` dan `bookId`; menerapkan business rules |
| PATCH | `/peminjaman/:id/kembalikan` | Body `studentId`; ID dapat berupa `recordId` atau ID numerik |

## Business Rules

- Hanya mahasiswa yang terdaftar dapat meminjam.
- Setiap mahasiswa maksimal memiliki tiga transaksi berstatus `active`.
- Jatuh tempo dihitung tujuh hari setelah peminjaman.
- Buku yang tidak berstatus `tersedia` ditolak.
- Hanya mahasiswa peminjam yang boleh mengembalikan.
- Transaksi berstatus `returned` tidak dapat dikembalikan lagi.
- Pengembalian mengubah status buku menjadi `tersedia` melalui Book Service.

## Menjalankan

Dari direktori `service/`:

```powershell
npm install
npm start
```

Script root memakai `concurrently` untuk menjalankan kedua workspace dan menghentikan pasangannya jika salah satu service berhenti. Lihat [README.md](../README.md) untuk contoh permintaan Postman serta [testing.md](testing.md) untuk hasil dan skenario verifikasi.