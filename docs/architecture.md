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
```

## 2. Architecture Setelah

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

## 3. Book Service

Book Service bertanggung jawab untuk mengelola data buku dan status ketersediaan buku.

### Tanggung Jawab

- Menampilkan daftar buku.
- Menampilkan detail buku.
- Mengecek buku yang tersedia.
- Mengubah status buku menjadi `dipinjam`.
- Mengubah status buku menjadi `tersedia`.
- Menyimpan data buku pada `books.json`.

### Endpoint

| Method | Endpoint | Fungsi |
|---|---|---|
| GET | `/books` | Menampilkan semua buku |
| GET | `/books/available` | Menampilkan buku yang tersedia |
| GET | `/books/:id` | Menampilkan detail buku |
| POST | `/books` | Menambahkan buku |
| DELETE | `/books/:id` | Menghapus buku |
| PATCH | `/books/:id/pinjam` | Mengubah status buku menjadi dipinjam |
| PATCH | `/books/:id/kembali` | Mengubah status buku menjadi tersedia |

## 4. Borrow Service

Borrow Service bertanggung jawab untuk mengelola proses peminjaman dan pengembalian buku.

### Tanggung Jawab

- Membuat data peminjaman.
- Mengecek batas maksimal 3 buku aktif.
- Mengecek apakah mahasiswa sudah meminjam buku yang sama.
- Mengelola tanggal peminjaman.
- Mengelola tanggal jatuh tempo.
- Memproses pengembalian buku.

### Endpoint

| Method | Endpoint | Fungsi |
|---|---|---|
| GET | `/peminjaman` | Menampilkan data peminjaman |
| POST | `/peminjaman` | Membuat peminjaman baru |
| PATCH | `/peminjaman/:recordId/kembalikan` | Memproses pengembalian buku |
## 5. Komunikasi Antar-Service

Borrow Service berkomunikasi dengan Book Service menggunakan HTTP API. Borrow Service tidak mengakses `books.json` secara langsung.

Pada proses peminjaman, Borrow Service terlebih dahulu meminta data buku kepada Book Service untuk mengecek keberadaan dan status buku. Jika buku tersedia dan validasi peminjaman terpenuhi, Borrow Service meminta Book Service untuk mengubah status buku menjadi `dipinjam`.

### Alur Peminjaman

```text
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
   | Validasi
   | - Buku tersedia
   | - Maksimal 3 buku aktif
   | - Belum memiliki peminjaman aktif
   |
   | PATCH /books/:id/pinjam
   v
Book Service
   |
   | Status = dipinjam
   v
Borrow Service
   |
   v
Frontend
```

### Alur Pengembalian

Pada proses pengembalian, Frontend mengirim permintaan ke Borrow Service. Borrow Service melakukan validasi peminjaman, kemudian meminta Book Service untuk mengubah status buku menjadi `tersedia`.

```text
Frontend
   |
   | PATCH /peminjaman/:recordId/kembalikan
   v
Borrow Service
   |
   | Validasi data peminjaman
   |
   | PATCH /books/:id/kembali
   v
Book Service
   |
   | Status = tersedia
   v
Borrow Service
   |
   | Peminjaman ditandai kembali
   v
Frontend
```

Pada proses pengembalian, Book Service diperbarui terlebih dahulu. Setelah
status buku berhasil menjadi tersedia, record peminjaman diubah menjadi
returned.

Hal tersebut digunakan untuk menjaga konsistensi data antara Borrow Service
dan Book Service.

## 6. Alur Fitur Utama

Salah satu alur fitur utama yang melibatkan lebih dari satu service adalah peminjaman buku.

```text
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
```

## 7. Perubahan Arsitektur
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
## 8. Technology

Technology yang digunakan:

- HTML
- CSS
- JavaScript
- Node.js
- Express.js
- JSON
- HTTP API
- Fetch API
- Live Server
