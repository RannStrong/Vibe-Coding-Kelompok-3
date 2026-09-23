# Dokumentasi AI Coding Tool

## AI Coding Tool yang Digunakan

AI digunakan untuk membantu:
- Mengembangkan Book Service
- Mengembangkan Borrow Service
- Menghubungkan API
- Membantu debugging
- Membantu dokumentasi

## Pemeriksaan Hasil AI

Kode hasil AI tidak langsung digunakan. Kode diperiksa kembali melalui:
- pengecekan struktur project
- pengujian API
- pengujian frontend
- pemeriksaan error
- perbaikan bug hasil pengujian

## Prompt yang Digunakan

### Book Service

| No | Prompt | Keterangan |
|---|---|---|
| 1 | "Saya memiliki proyek Sistem Peminjaman Buku Perpustakaan yang sebelumnya dibuat menggunakan HTML, CSS, JavaScript, dan localStorage. Kembangkan backend menjadi Book Service menggunakan Node.js, Express.js, REST API, JSON sebagai penyimpanan data sederhana. Book Service harus memiliki fitur: menampilkan seluruh buku, menampilkan buku yang tersedia, mengambil detail buku berdasarkan ID, mengubah status buku menjadi dipinjam, mengubah status buku menjadi tersedia kembali. Buat kode yang sederhana dan mudah dipahami mahasiswa. Jelaskan setiap endpoint dan cara menjalankannya. Jangan membuat service peminjaman di dalam Book Service." | Meminta AI membuat Book Service dari awal berdasarkan project yang sudah ada |
| 2 | "Saya telah membuat Book Service. Apa langkah selanjutnya yang perlu dilakukan untuk melanjutkan pengembangan project?" | Meminta AI memberikan langkah selanjutnya setelah Book Service dibuat |
| 3 | "Berikut adalah file server.js yang telah saya buat. Tolong lakukan review terhadap kode tersebut dan jelaskan apakah terdapat bagian yang perlu diperbaiki." | Meminta AI melakukan review terhadap kode Book Service |
| 4 | "Saya ingin melakukan pengujian terhadap Book Service terlebih dahulu. Bagaimana langkah-langkah pengujian yang perlu dilakukan?" | Meminta AI memberikan panduan untuk melakukan testing Book Service |
| 5 | "Saya sudah menjalankan Book Service pada localhost, tetapi ketika diakses muncul pesan Cannot GET /. Apa penyebabnya dan bagaimana cara mengatasinya?" | Meminta AI membantu menjelaskan masalah `Cannot GET /` pada Book Service |

### Hasil Coding dari AI

AI menghasilkan Book Service menggunakan **Node.js dan Express.js** dengan **REST API** serta **JSON sebagai penyimpanan data**.

Struktur utama:

- `book-service/server.js`
- `book-service/package.json`
- `book-service/data/books.json`

Book Service menggunakan **port 3000**.

Endpoint utama yang dihasilkan:

- `GET /books`
- `GET /books/available`
- `GET /books/:id`
- `POST /books`
- `DELETE /books/:id`
- `PATCH /books/:id/pinjam`
- `PATCH /books/:id/kembali`

Fitur yang dihasilkan:

- Menampilkan seluruh data buku
- Menampilkan buku yang tersedia
- Menampilkan detail buku berdasarkan ID
- Menambahkan buku
- Menghapus buku
- Mengubah status buku menjadi `dipinjam`
- Mengubah status buku menjadi `tersedia`
- Validasi input
- Penanganan error
- CORS untuk mendukung komunikasi dengan frontend

Contoh bagian kode yang dihasilkan AI:

```js
const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 3000;

app.use(express.json());
```

### Borrow Service

| No | Prompt | Keterangan |
|---|---|---|
| 1 | "Berikut adalah pembagian tugas dalam project: Orang 1 menangani Book Service — Data + API buku; Orang 2 menangani Borrow Service — Peminjaman + pengembalian; Orang 3 menangani Frontend — Tampilan + JavaScript; Orang 4 menangani Integrasi — Hubungkan Book ↔ Borrow ↔ Frontend; dan Orang 5 menangani Testing + Dokumentasi — Tes aplikasi + README + dokumentasi + perbaikan bug. Jelaskan tanggung jawab dan ruang lingkup masing-masing bagian." | Meminta AI menjelaskan pembagian bagian dan tugas dalam proyek |
| 2 | "Berdasarkan pembagian tugas dan project yang telah dijelaskan, tolong bantu membuat Borrow Service untuk menangani proses peminjaman dan pengembalian buku." | Meminta AI membuat Borrow Service berdasarkan penjelasan proyek |
| 3 | "Berikut adalah file project saya. Saya bertanggung jawab mengerjakan bagian Borrow Service sesuai dengan pembagian tugas tersebut. Tolong jelaskan langkah yang perlu saya lakukan dan sesuaikan implementasinya dengan project yang sudah ada."| Meminta AI menyesuaikan pengerjaan Borrow Service dengan project yang sudah ada |

### Hasil Coding dari AI

AI menghasilkan Borrow Service menggunakan Node.js dan Express.js dengan port 3001.

Struktur utama:
- `borrow-service/server.js`
- `borrow-service/package.json`
- `borrow-service/script.js`

Endpoint utama yang dihasilkan:
- `GET /peminjaman`
- `POST /peminjaman`
- `PATCH /peminjaman/:recordId/kembalikan`

Contoh bagian kode yang dihasilkan AI:

```js
const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 3001;

app.use(express.json());
```

### API / Integrasi Antar-Service

| No | Prompt | Keterangan |
|---|---|---|
| 1 | "Lakukan pemeriksaan terhadap endpoint Book Service dan bandingkan response yang dihasilkan dengan struktur kode yang seharusnya digunakan oleh Borrow Service. | AI memverifikasi endpoint Book Service, struktur response, status buku, serta hal yang perlu diperhatikan saat diakses Borrow Service. |
| 2 | "Saya telah melakukan pemeriksaan terhadap kode Book Service. Berikut adalah hasil pemeriksaannya. Tolong verifikasi kembali struktur API, response, status buku, serta kondisi error yang perlu ditangani oleh Borrow Service." | AI menjelaskan hasil pemeriksaan API dan menemukan beberapa kondisi error yang perlu ditangani, seperti Book Service tidak dapat diakses, response bukan JSON, dan perubahan status buku yang bisa gagal. |
| 3 | "Tolong analisis terlebih dahulu kode borrow-service dan jelaskan bagian mana yang perlu diubah agar Borrow Service dapat memanggil Book Service, bagaimana alur POST /peminjaman setelah perubahan, serta jangan melakukan perubahan pada kode terlebih dahulu. Setelah itu, saya akan mengirimkan file book-service/server.js." | AI menganalisis kode borrow service dan AI memberikan **Opsi A (rollback)**, yaitu menghapus kembali record peminjaman jika perubahan status buku di Book Service gagal agar data tetap konsisten. |
| 4 | "Opsi A (rollback) telah disepakati. Sekarang buatkan kode lengkap borrow-service/server.js dengan menerapkan alur tersebut, termasuk komunikasi dengan Book Service melalui GET /books/:id dan PATCH /books/:id/pinjam, serta rollback apabila proses perubahan status buku gagal." | AI menerapkan Opsi A ke kode Borrow Service dengan `GET /books/:id`, `PATCH /books/:id/pinjam`, dan penghapusan record jika proses gagal. |

### Hasil Coding dari AI

AI melakukan pembaruan pada **`borrow-service/server.js`** untuk menghubungkan Borrow Service dengan Book Service melalui API.

Perubahan utama:

- Menambahkan `BOOK_SERVICE_URL = "http://localhost:3000"`.
- Menambahkan fungsi `callBookService()` untuk komunikasi dengan Book Service.
- `POST /peminjaman` mengambil data buku melalui `GET /books/:id`.
- Data buku diambil dari `response.data.data`.
- Mengecek apakah status buku adalah `"tersedia"`.
- `title` pada data peminjaman diambil dari `book.judul`.
- Setelah record dibuat, Borrow Service memanggil `PATCH /books/:id/pinjam`.
- Jika proses tersebut gagal, dilakukan **rollback** dengan menghapus record yang baru dibuat.
- Book Service yang tidak dapat diakses atau memberikan response bukan JSON ditangani dengan status **502**.
- Endpoint `GET /peminjaman` dan `PATCH /peminjaman/:recordId/kembalikan` tetap dipertahankan.
- Tidak menambahkan dependency baru karena menggunakan `fetch` bawaan Node.js.
- Kode kemudian dicek menggunakan `node --check` dan **lolos pengecekan sintaks**.