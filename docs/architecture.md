# Architecture

## 1. Architecture Sebelum

Sebelum dikembangkan menjadi microservice, aplikasi perpustakaan menggunakan
HTML, CSS, JavaScript, dan `localStorage`.

Pada arsitektur awal, frontend menangani tampilan serta penyimpanan data
peminjaman secara langsung pada browser.

```text
User
  |
  v
Frontend
  |
  v
localStorage
2. Architecture Setelah

Setelah dikembangkan, aplikasi menggunakan arsitektur microservice dengan
dua service utama:

Book Service
Borrow Service

Frontend berfungsi sebagai client yang berkomunikasi dengan kedua service
menggunakan HTTP API.

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

Pada arsitektur tersebut, Borrow Service melakukan komunikasi ke Book Service
untuk mendapatkan informasi buku dan mengubah status buku.

3. Book Service

Book Service bertanggung jawab terhadap data dan status buku.

Fungsi utama:

Menampilkan seluruh buku
Menampilkan buku yang tersedia
Menampilkan detail buku
Menambahkan buku
Menghapus buku
Mengubah status buku menjadi dipinjam
Mengubah status buku menjadi tersedia

Book Service berjalan pada:

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

4. Borrow Service

Borrow Service bertanggung jawab terhadap proses peminjaman dan pengembalian
buku.

Fungsi utama:

Membuat data peminjaman
Menampilkan data peminjaman
Memproses pengembalian buku
Menerapkan batas maksimal 3 buku aktif
Memvalidasi mahasiswa yang melakukan pengembalian
Berkomunikasi dengan Book Service melalui HTTP API

Borrow Service berjalan pada:

http://localhost:3001

Endpoint Borrow Service
Method	Endpoint	Fungsi
GET	/peminjaman	Mendapatkan data peminjaman
POST	/peminjaman	Membuat data peminjaman
PATCH	/peminjaman/:recordId/kembalikan	Mengembalikan buku
5. Komunikasi Antar-Service

Borrow Service tidak membaca file books.json secara langsung.

Borrow Service menggunakan HTTP API untuk berkomunikasi dengan Book Service.

Alur Peminjaman
Frontend
   |
   | POST /peminjaman
   | { studentId, bookId }
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
   | Validasi buku dan batas peminjaman
   |
   | Membuat record peminjaman
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
Alur Pengembalian
Frontend
   |
   | PATCH /peminjaman/:recordId/kembalikan
   v
Borrow Service
   |
   | Validasi mahasiswa
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

Pada proses pengembalian, Book Service diperbarui terlebih dahulu. Setelah
status buku berhasil menjadi tersedia, record peminjaman diubah menjadi
returned.

Hal tersebut digunakan untuk menjaga konsistensi data antara Borrow Service
dan Book Service.

6. Alur Fitur Utama

Salah satu alur fitur utama yang melibatkan lebih dari satu service adalah
peminjaman buku.

Mahasiswa
    |
    v
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
    | Informasi buku
    | dan status
    v
Borrow Service
    |
    | Validasi
    |
    | PATCH /books/:id/pinjam
    v
Book Service
    |
    | Status menjadi dipinjam
    v
Borrow Service
    |
    v
Frontend
7. Perubahan Arsitektur
Sebelum
Frontend menangani tampilan dan sebagian pengelolaan data.
Data peminjaman menggunakan localStorage.
Belum ada pemisahan service berdasarkan fungsi.
Belum ada komunikasi antar-service melalui API.
Sesudah
Pengelolaan data buku dipisahkan ke Book Service.
Pengelolaan transaksi dipisahkan ke Borrow Service.
Frontend berkomunikasi dengan backend melalui HTTP API.
Borrow Service berkomunikasi dengan Book Service.
Setiap service memiliki fungsi dan tanggung jawab yang jelas.
8. Technology

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

---

# 2. `docs/sharing-session.md`

```md
# Sharing Session — Vibe Coding Kelompok 3

## 1. Architecture Sebelum dan Sesudah Dikembangkan

### Architecture Sebelum

Pada versi awal, aplikasi perpustakaan dibuat menggunakan HTML, CSS, dan
JavaScript.

Data peminjaman masih menggunakan `localStorage` pada browser.

```text
User
  |
  v
Frontend
  |
  v
localStorage

Pada arsitektur awal, frontend menangani tampilan dan sebagian pengelolaan
data secara langsung pada sisi client.

Architecture Sesudah

Project kemudian dikembangkan menjadi arsitektur microservice dengan dua
service utama:

Book Service
Borrow Service

Frontend berfungsi sebagai client yang berkomunikasi dengan service
menggunakan HTTP API.

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

Pada arsitektur ini, Borrow Service melakukan komunikasi dengan Book Service
untuk mendapatkan data buku dan mengubah status buku.

2. Microservice yang Dibuat
Book Service

Book Service bertanggung jawab terhadap data dan status buku.

Fungsi utama:

Menampilkan seluruh buku
Menampilkan buku yang tersedia
Menampilkan detail buku
Menambahkan buku
Menghapus buku
Mengubah status buku menjadi dipinjam
Mengubah status buku menjadi tersedia

Book Service berjalan pada port:

3000

Borrow Service

Borrow Service bertanggung jawab terhadap proses peminjaman dan pengembalian.

Fungsi utama:

Membuat data peminjaman
Menampilkan data peminjaman
Memproses pengembalian buku
Menerapkan batas maksimal 3 buku aktif
Memvalidasi mahasiswa yang melakukan pengembalian
Berkomunikasi dengan Book Service melalui HTTP API

Borrow Service berjalan pada port:

3001

3. Technology yang Digunakan

Technology yang digunakan dalam project:

HTML
CSS
JavaScript
Node.js
Express.js
JSON
HTTP API
Fetch API
Live Server

Data buku pada Book Service disimpan menggunakan file JSON.

4. AI Coding Tool yang Digunakan

Kelompok menggunakan AI Coding Tool untuk membantu proses:

Pengembangan service
Pembuatan endpoint API
Integrasi antar-service
Penyesuaian frontend
Debugging
Dokumentasi

AI Coding Tool yang digunakan:

ChatGPT
Claude

Kode yang dihasilkan AI tidak langsung digunakan tanpa pemeriksaan.
Kode diperiksa dan diuji kembali agar sesuai dengan struktur dan kebutuhan
project.

5. Bagaimana AI Membantu Proses Pengembangan
Book Service

AI membantu mengembangkan service untuk data buku dan endpoint API.

Endpoint yang digunakan antara lain:

GET /books
GET /books/available
GET /books/:id
POST /books
DELETE /books/:id
PATCH /books/:id/pinjam
PATCH /books/:id/kembali
Borrow Service

AI membantu mengembangkan service peminjaman dan pengembalian serta
merancang komunikasi dengan Book Service.

Borrow Service mengambil informasi buku melalui HTTP API dan tidak membaca
file books.json secara langsung.

Frontend

AI membantu menyesuaikan frontend dengan API service.

Debugging

AI membantu menganalisis error yang ditemukan saat project dijalankan,
termasuk error path file, ketidaksesuaian struktur kode, dan masalah
integrasi antar-service.

6. Alur Fitur yang Melibatkan Antar-Service
Alur Peminjaman
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
Alur Pengembalian
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
7. Pengujian yang Dilakukan

Testing dilakukan terhadap:

Book Service
Borrow Service
Frontend
Komunikasi antar-service
Peminjaman buku
Pengembalian buku

Hasil pengujian yang telah dilakukan:

Book Service dapat dijalankan pada port 3000.
Borrow Service dapat dijalankan pada port 3001.
Data buku dapat diakses melalui API.
Peminjaman buku dapat dibuat melalui Borrow Service.
Status buku berubah menjadi dipinjam.
Data peminjaman tersimpan dengan status active.
Pengembalian buku dapat dilakukan.
Data peminjaman berubah menjadi returned.
Setelah perbaikan, status buku kembali menjadi tersedia.
8. Masalah atau Kesalahan yang Ditemukan dari Hasil AI

Kode hasil AI tidak selalu langsung sesuai dengan kondisi project.

Masalah 1 — Path books.json

Pada proses pengembangan, sempat terjadi ketidaksesuaian lokasi file
books.json.

Service mencoba membaca:

book-service/data/books.json

sedangkan struktur file pada saat itu tidak sesuai sehingga muncul error
ENOENT.

Masalah tersebut kemudian diperbaiki dengan menyesuaikan struktur folder
dan lokasi file.

Masalah 2 — Ketidaksesuaian Class CSS

Versi awal JavaScript yang dihasilkan AI menggunakan nama class CSS yang
berbeda dengan class pada CSS asli project.

Setelah file CSS dan JavaScript lama diperiksa, kode disesuaikan agar
menggunakan class yang benar.

Masalah 3 — Frontend Menggunakan Data Buku Lama

Saat dilakukan testing, frontend menampilkan enam buku lama:

Introduction to Algorithms
Clean Code
Database System Concepts
Computer Networking
Operating System Concepts
Software Engineering

Sementara Book Service menyediakan lima data buku yang berbeda.

Setelah diperiksa, ditemukan adanya SEED_BOOKS pada frontend yang masih
menyediakan data buku lama.

Hal tersebut menunjukkan bahwa frontend dan Book Service belum menggunakan
sumber data yang sama.

Masalah 4 — Status Buku Tidak Sinkron Saat Pengembalian

Saat testing pengembalian ditemukan:

Record peminjaman berubah menjadi returned.
Status buku pada Book Service masih dipinjam.

Akibatnya, data antara Borrow Service dan Book Service menjadi tidak sinkron.

Masalah diperbaiki dengan membuat Borrow Service memanggil:

PATCH /books/:id/kembali

ke Book Service sebelum record peminjaman diubah menjadi returned.

Setelah dilakukan retest:

Record peminjaman menjadi returned.
Status buku menjadi tersedia.
9. Peran AI dan Pemeriksaan Manusia

AI membantu mempercepat proses pengembangan, tetapi hasil AI tidak langsung
digunakan tanpa pemeriksaan.

Pemeriksaan dilakukan melalui:

Pemeriksaan struktur folder.
Pemeriksaan endpoint API.
Menjalankan service secara lokal.
Menguji request dan response API.
Menguji frontend.
Memeriksa error pada terminal dan browser.
Menemukan bug.
Memperbaiki bug.
Melakukan pengujian ulang.
10. Pembagian Tugas Kelompok
Orang 1 — Book Service

Bertanggung jawab terhadap data dan API buku.

Orang 2 — Borrow Service

Bertanggung jawab terhadap peminjaman dan pengembalian.

Orang 3 — Frontend

Bertanggung jawab terhadap tampilan dan JavaScript frontend.

Orang 4 — Integrasi

Bertanggung jawab menghubungkan Book Service, Borrow Service, dan Frontend.

Orang 5 — Testing + Dokumentasi

Bertanggung jawab melakukan testing, membuat dokumentasi, membuat README,
mendokumentasikan penggunaan AI Coding Tool, dan membantu memperbaiki bug
yang ditemukan saat testing.

11. Kesimpulan

Project perpustakaan yang awalnya menggunakan frontend dan localStorage
dikembangkan menjadi arsitektur microservice.

Book Service bertanggung jawab terhadap data dan status buku, sedangkan
Borrow Service bertanggung jawab terhadap transaksi peminjaman dan
pengembalian.

Kedua service berkomunikasi menggunakan HTTP API.

AI Coding Tool membantu proses pengembangan, tetapi kode yang dihasilkan tetap
diperiksa, diuji, dan diperbaiki berdasarkan hasil pengujian.

Hasil testing juga digunakan untuk menemukan bug dan melakukan perbaikan
sebelum aplikasi digunakan sebagai hasil akhir project.


### Catatan penting

Versi ini sudah saya samakan istilah dan alurnya supaya tidak saling bertentangan:

`Frontend → Borrow Service → Book Service`

terutama untuk peminjaman dan pengembalian.

Setelah mengganti kedua file, **jangan langsung `git add .`**. Karena `PR` sebelumnya sudah di-merge ke `main`, kamu cukup cek:

```powershell
git status