# Vibe Coding Kelompok 3 — UINSI Library

## Deskripsi

UINSI Library adalah aplikasi perpustakaan sederhana yang dikembangkan dari
project perpustakaan sebelumnya menjadi arsitektur berbasis microservice.

Project menggunakan frontend HTML, CSS, dan JavaScript serta dua service utama:

- Book Service
- Borrow Service

Komunikasi antar-service dilakukan menggunakan HTTP API.

---

## Architecture

### Sebelum Dikembangkan

Pada versi awal, aplikasi menggunakan HTML, CSS, JavaScript, dan
`localStorage` untuk menyimpan data peminjaman pada browser.

```text
User
  |
  v
Frontend
  |
  v
localStorage
Setelah Dikembangkan

Project dikembangkan menjadi dua microservice:

Book Service
Borrow Service

Frontend berfungsi sebagai client yang berkomunikasi dengan service melalui
HTTP API.

                    +----------------+
                    |    Frontend    |
                    |   HTML/CSS/JS  |
                    +-------+--------+
                            |
                  +---------+---------+
                  |                   |
                  v                   v
          +---------------+   +----------------+
          | Book Service  |<--| Borrow Service |
          | Port 3000     |API| Port 3001      |
          +-------+-------+   +----------------+
                  |
                  v
              books.json

Dokumentasi architecture lengkap dapat dilihat pada:

docs/architecture.md

Microservice
1. Book Service

Book Service bertanggung jawab terhadap data dan status buku.

Fungsi utama:

Menampilkan seluruh buku
Menampilkan buku yang tersedia
Menampilkan detail buku
Menambahkan buku
Menghapus buku
Mengubah status buku menjadi dipinjam
Mengubah status buku menjadi tersedia

Port:

3000

Base URL:

http://localhost:3000

Endpoint Book Service
Method	Endpoint	Fungsi
GET	/books	Mendapatkan seluruh data buku
GET	/books/available	Mendapatkan buku yang tersedia
GET	/books/:id	Mendapatkan detail buku
POST	/books	Menambahkan buku
DELETE	/books/:id	Menghapus buku
PATCH	/books/:id/pinjam	Mengubah status buku menjadi dipinjam
PATCH	/books/:id/kembali	Mengubah status buku menjadi tersedia

Data buku disimpan dalam:

book-service/data/books.json

2. Borrow Service

Borrow Service bertanggung jawab terhadap proses peminjaman dan pengembalian.

Fungsi utama:

Membuat data peminjaman
Menampilkan data peminjaman
Memproses pengembalian buku
Menerapkan batas maksimal 3 buku aktif
Memvalidasi mahasiswa yang melakukan pengembalian
Berkomunikasi dengan Book Service melalui HTTP API

Port:

3001

Base URL:

http://localhost:3001

Endpoint Borrow Service
Method	Endpoint	Fungsi
GET	/peminjaman	Mendapatkan data peminjaman
POST	/peminjaman	Membuat peminjaman
PATCH	/peminjaman/:recordId/kembalikan	Mengembalikan buku
Alur Komunikasi Antar-Service
Peminjaman
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
   | Data buku + status
   v
Borrow Service
   |
   | Validasi peminjaman
   |
   | PATCH /books/:id/pinjam
   v
Book Service
   |
   | Status buku = dipinjam
   v
Borrow Service
   |
   v
Frontend
Pengembalian
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
   | Status buku = tersedia
   v
Borrow Service
   |
   | Status record = returned
   v
Frontend

Borrow Service tidak membaca books.json secara langsung. Informasi dan
perubahan status buku dilakukan melalui API Book Service.

Technology

Technology yang digunakan:

HTML
CSS
JavaScript
Node.js
Express.js
JSON
HTTP API
Fetch API
Live Server

Data buku disimpan menggunakan file JSON.

Struktur Project
Vibe-Coding-Kelompok-3/
│
├── index.html
├── script.js
├── style.css
├── README.md
│
├── book-service/
│   ├── data/
│   │   └── books.json
│   ├── package.json
│   ├── package-lock.json
│   └── server.js
│
├── borrow-service/
│   ├── package.json
│   ├── package-lock.json
│   ├── server.js
│   └── script.js
│
└── docs/
    ├── testing.md
    ├── bug-report.md
    ├── ai-coding.md
    ├── architecture.md
    └── sharing-session.md
Cara Menjalankan Project

Project terdiri dari frontend dan dua service.

1. Menjalankan Book Service

Buka terminal:

cd book-service
npm install
npm start

Book Service berjalan pada:

http://localhost:3000

2. Menjalankan Borrow Service

Buka terminal baru:

cd borrow-service
npm install
npm start

Borrow Service berjalan pada:

http://localhost:3001

3. Menjalankan Frontend

Buka project menggunakan VS Code.

Klik kanan:

index.html

kemudian pilih:

Open with Live Server

Frontend biasanya dibuka melalui:

http://127.0.0.1:5500/

Catatan Windows PowerShell

Jika PowerShell menolak perintah npm karena execution policy, gunakan:

npm.cmd install
npm.cmd start
Contoh Alur Peminjaman

Frontend mengirim:

{
  "studentId": "S001",
  "bookId": 1
}

Borrow Service kemudian:

Memeriksa data buku melalui Book Service.
Memeriksa status ketersediaan buku.
Memeriksa batas maksimal 3 buku aktif.
Membuat record peminjaman.
Meminta Book Service mengubah status buku menjadi dipinjam.
Mengembalikan hasil peminjaman ke frontend.
Testing

Testing dilakukan terhadap:

Book Service
Borrow Service
Frontend
Komunikasi antar-service
Peminjaman buku
Pengembalian buku

Hasil pengujian yang telah dilakukan:

Book Service berhasil dijalankan pada port 3000.
Borrow Service berhasil dijalankan pada port 3001.
Data buku berhasil diakses melalui API.
Peminjaman buku berhasil dibuat.
Status buku berubah menjadi dipinjam.
Data peminjaman tersimpan dengan status active.
Pengembalian berhasil dilakukan.
Record peminjaman berubah menjadi returned.
Setelah perbaikan bug, status buku kembali menjadi tersedia.

Dokumentasi lengkap:

Testing Documentation

Bug dan Perbaikan

Saat pengujian ditemukan beberapa masalah.

Bug Status Buku Saat Pengembalian

Sebelum diperbaiki:

Record peminjaman berubah menjadi returned.
Status buku pada Book Service masih dipinjam.

Hal tersebut menyebabkan data Borrow Service dan Book Service tidak sinkron.

Perbaikan dilakukan dengan membuat Borrow Service memanggil:

PATCH /books/:id/kembali

ke Book Service sebelum record peminjaman diubah menjadi returned.

Setelah retest:

Record menjadi returned.
Status buku menjadi tersedia.

Dokumentasi bug:

Bug Report

AI Coding Tool

AI Coding Tool digunakan untuk membantu:

Pengembangan Book Service
Pengembangan Borrow Service
Pengembangan dan penyesuaian frontend
Integrasi API
Debugging
Dokumentasi

AI Coding Tool yang digunakan:

ChatGPT
Claude

Kode hasil AI tidak langsung digunakan tanpa pemeriksaan. Kode diperiksa,
dijalankan, diuji, dan diperbaiki apabila ditemukan kesalahan.

Dokumentasi AI:

AI Coding Documentation

Masalah yang Ditemukan dari Hasil AI

Beberapa masalah yang ditemukan selama proses pengembangan:

Path books.json sempat tidak sesuai dengan struktur folder sehingga
menyebabkan error ENOENT.
Versi awal JavaScript menggunakan class CSS yang tidak sesuai dengan CSS
project asli.
Frontend masih memiliki SEED_BOOKS sehingga menampilkan data buku lama
dan tidak sama dengan data pada Book Service.
Status buku tidak sinkron dengan status peminjaman saat proses
pengembalian.

Setiap masalah diperiksa dan diperbaiki berdasarkan hasil pengujian.

Pembagian Tugas Kelompok
Orang 1 — Book Service

Data dan API buku.

Orang 2 — Borrow Service

Peminjaman dan pengembalian.

Orang 3 — Frontend

Tampilan dan JavaScript frontend.

Orang 4 — Integrasi

Menghubungkan Book Service, Borrow Service, dan Frontend.

Orang 5 — Testing + Dokumentasi

Testing aplikasi, dokumentasi, README, dokumentasi AI Coding Tool, dan
membantu memperbaiki bug yang ditemukan saat testing.

Dokumentasi

Dokumentasi project:

Architecture
Testing
Bug Report
AI Coding Tool
Sharing Session
Sharing Session

Materi sharing session mencakup:

Architecture sebelum dan sesudah dikembangkan.
Microservice yang dibuat.
Technology yang digunakan.
AI Coding Tool yang digunakan.
Bagaimana AI membantu proses pengembangan.
Masalah dan kesalahan yang ditemukan dari hasil AI.

Materi lengkap:

Sharing Session Documentation

Kesimpulan

Project perpustakaan yang awalnya menggunakan frontend dan localStorage
dikembangkan menjadi arsitektur microservice.

Book Service bertanggung jawab terhadap data dan status buku, sedangkan
Borrow Service bertanggung jawab terhadap transaksi peminjaman dan
pengembalian.

Kedua service berkomunikasi menggunakan HTTP API.

AI Coding Tool digunakan untuk membantu pengembangan, tetapi hasil kode tetap
diperiksa dan diuji kembali. Proses testing juga digunakan untuk menemukan dan
memperbaiki bug sebelum project digunakan sebagai hasil akhir.


### Setelah paste

Simpan `README.md` dengan **Ctrl + S**.

Karena PR sebelumnya sudah di-merge, untuk perubahan README ini kamu bisa langsung:

```powershell
git add README.md
git commit -m "docs: add project README"
git push origin main