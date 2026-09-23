# Sharing Session — Vibe Coding Kelompok 3

## 1. Architecture Sebelum dan Sesudah Dikembangkan

### Architecture Sebelum

Pada versi awal, aplikasi perpustakaan dibuat menggunakan HTML, CSS, dan JavaScript.

Data peminjaman masih menggunakan `localStorage` pada browser.

```text
User
  |
  v
Frontend
  |
  v
localStorage
```

Pada arsitektur awal, frontend menangani tampilan dan sebagian pengelolaan data secara langsung pada sisi client.

### Architecture Sesudah

Project kemudian dikembangkan menjadi arsitektur microservice dengan dua service utama:

- Book Service
- Borrow Service

Frontend menjadi client yang berkomunikasi dengan service menggunakan HTTP API.

```text
                    +----------------+
                    |    Frontend    |
                    |   HTML/CSS/JS  |
                    +-------+--------+
                            |
                  +---------+---------+
                  |                   |
                  v                   v
          +---------------+   +----------------+
          | Book Service  |<->| Borrow Service |
          | Port 3000     |API| Port 3001      |
          +-------+-------+   +----------------+
                  |
                  v
              books.json
```

---

## 2. Microservice yang Dibuat

### Book Service

Book Service bertanggung jawab terhadap data dan status buku.

**Fungsi utama:**

- Menampilkan seluruh buku
- Menampilkan buku yang tersedia
- Menampilkan detail buku
- Menambahkan buku
- Menghapus buku
- Mengubah status buku menjadi dipinjam
- Mengubah status buku menjadi tersedia

Book Service berjalan pada port:

`3000`

### Borrow Service

Borrow Service bertanggung jawab terhadap proses peminjaman dan pengembalian.

**Fungsi utama:**

- Membuat data peminjaman
- Menampilkan data peminjaman
- Memproses pengembalian buku
- Menerapkan batas maksimal 3 buku aktif
- Memvalidasi mahasiswa yang melakukan pengembalian
- Berkomunikasi dengan Book Service melalui HTTP API

Borrow Service berjalan pada port:

`3001`

---

## 3. Technology yang Digunakan

Technology yang digunakan dalam project:

- HTML
- CSS
- JavaScript
- Node.js
- Express.js
- JSON
- HTTP API
- Fetch API
- Live Server

Data buku pada Book Service disimpan menggunakan file JSON.

---

## 4. AI Coding Tool yang Digunakan

Kelompok menggunakan AI Coding Tool untuk membantu proses pengembangan, debugging, integrasi, dan dokumentasi.

**AI Coding Tool yang digunakan:**

- ChatGPT
- Claude

AI tidak digunakan sebagai pengganti pemeriksaan manusia. Kode yang dihasilkan AI diperiksa dan diuji kembali sebelum digunakan.

---

## 5. Bagaimana AI Membantu Proses Pengembangan

AI membantu kelompok pada beberapa tahap pengembangan.

### Book Service

AI membantu mengembangkan service untuk data buku dan endpoint API.

**Endpoint yang digunakan antara lain:**

```text
GET /books
GET /books/available
GET /books/:id
POST /books
DELETE /books/:id
PATCH /books/:id/pinjam
PATCH /books/:id/kembali
```

### Borrow Service

AI membantu mengembangkan service peminjaman dan pengembalian serta merancang komunikasi dengan Book Service.

Borrow Service mengambil informasi buku melalui API Book Service dan tidak membaca file `books.json` secara langsung.

### Frontend

AI membantu menyesuaikan frontend agar dapat berkomunikasi dengan service menggunakan API.

### Debugging

AI membantu menganalisis error yang ditemukan ketika project dijalankan, termasuk error path file dan ketidaksesuaian kode dengan struktur project.

---

## 6. Alur Fitur yang Melibatkan Antar-Service

Salah satu alur utama yang diuji adalah peminjaman buku.

```text
Frontend
   |
   | POST /peminjaman
   v
Borrow Service
   |
   | GET /books/:id
   v
Book Service
   |
   | informasi buku + status
   v
Borrow Service
   |
   | validasi peminjaman
   |
   | PATCH /books/:id/pinjam
   v
Book Service
   |
   | status = dipinjam
   v
Borrow Service
   |
   v
Frontend
```

### Untuk pengembalian

```text
Frontend
   |
   | PATCH /peminjaman/:recordId/kembalikan
   v
Borrow Service
   |
   | PATCH /books/:id/kembali
   v
Book Service
   |
   | status = tersedia
   v
Borrow Service
   |
   | record = returned
   v
Frontend
```

---

## 7. Pengujian yang Dilakukan

Testing dilakukan terhadap:

- Book Service
- Borrow Service
- Frontend
- Komunikasi antar-service
- Peminjaman buku
- Pengembalian buku

### Hasil testing yang berhasil

- Book Service dapat dijalankan pada port 3000.
- Borrow Service dapat dijalankan pada port 3001.
- Data buku dapat diakses melalui API.
- Peminjaman buku dapat dibuat melalui Borrow Service.
- Status buku berubah menjadi dipinjam.
- Data peminjaman tersimpan dengan status active.
- Pengembalian dapat dilakukan.
- Data peminjaman berubah menjadi returned.
- Setelah perbaikan, status buku kembali menjadi tersedia.

---

## 8. Masalah atau Kesalahan yang Ditemukan dari Hasil AI

Kode hasil AI tidak selalu langsung sesuai dengan kondisi project.

### Masalah 1 — Path `books.json`

Pada proses pengembangan, sempat terjadi ketidaksesuaian lokasi file `books.json`.

Service mencoba membaca:

```text
book-service/data/books.json
```

sementara struktur file pada saat itu tidak sesuai sehingga muncul error `ENOENT`.

Masalah tersebut kemudian diperbaiki dengan menyesuaikan struktur folder dan lokasi file.

### Masalah 2 — Ketidaksesuaian Class CSS

Versi awal JavaScript yang dihasilkan AI menggunakan nama class CSS yang berbeda dengan class pada CSS asli project.

Setelah file CSS dan JavaScript lama diperiksa, kode disesuaikan agar kembali menggunakan class yang benar.

### Masalah 3 — Frontend Menggunakan Data Buku Lama

Saat dilakukan testing, frontend menampilkan enam buku lama seperti:

- Introduction to Algorithms
- Clean Code
- Database System Concepts
- Computer Networking
- Operating System Concepts
- Software Engineering

Sementara Book Service menyediakan lima data buku yang berbeda.

Setelah diperiksa, ditemukan adanya `SEED_BOOKS` pada frontend yang masih menyediakan data buku lama.

Hal tersebut menunjukkan bahwa frontend dan Book Service belum menggunakan sumber data yang sama.

### Masalah 4 — Status Buku Tidak Sinkron Saat Pengembalian

Saat testing pengembalian ditemukan:

- Record peminjaman berubah menjadi `returned`.
- Namun status buku pada Book Service masih dipinjam.

Akibatnya data antara Borrow Service dan Book Service tidak sinkron.

Masalah diperbaiki dengan membuat Borrow Service memanggil:

```text
PATCH /books/:id/kembali
```

ke Book Service sebelum record peminjaman diubah menjadi `returned`.

Setelah dilakukan retest:

- Record peminjaman menjadi `returned`.
- Status buku menjadi tersedia.

---

## 9. Peran AI dan Pemeriksaan Manusia

AI membantu mempercepat proses pengembangan, tetapi hasil AI tidak langsung digunakan tanpa pemeriksaan.

Pemeriksaan dilakukan melalui:

- Pemeriksaan struktur folder.
- Pemeriksaan endpoint API.
- Menjalankan service secara lokal.
- Menguji request dan response API.
- Menguji frontend.
- Memeriksa error pada terminal dan browser.
- Menemukan bug.
- Memperbaiki bug.
- Melakukan pengujian ulang.

---

## 10. Pembagian Tugas Kelompok

### Orang 1 — Book Service

Bertanggung jawab terhadap data dan API buku.

### Orang 2 — Borrow Service

Bertanggung jawab terhadap peminjaman dan pengembalian.

### Orang 3 — Frontend

Bertanggung jawab terhadap tampilan dan JavaScript frontend.

### Orang 4 — Integrasi

Bertanggung jawab menghubungkan Book Service, Borrow Service, dan Frontend.

### Orang 5 — Testing + Dokumentasi

Bertanggung jawab melakukan testing, membuat dokumentasi, membuat README, mendokumentasikan penggunaan AI Coding Tool, dan membantu memperbaiki bug yang ditemukan saat testing.

---

## 11. Kesimpulan

Project perpustakaan yang awalnya menggunakan frontend dan `localStorage` dikembangkan menjadi arsitektur microservice.

Book Service bertanggung jawab terhadap data dan status buku, sedangkan Borrow Service bertanggung jawab terhadap transaksi peminjaman dan pengembalian.

Kedua service berkomunikasi menggunakan HTTP API.

AI Coding Tool membantu proses pengembangan, tetapi kode yang dihasilkan tetap diperiksa, diuji, dan diperbaiki berdasarkan hasil pengujian.

Hasil testing juga digunakan untuk menemukan bug dan melakukan perbaikan sebelum aplikasi digunakan sebagai hasil akhir project.