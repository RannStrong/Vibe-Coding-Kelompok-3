# UINSI Library

Aplikasi katalog buku dan peminjaman dengan frontend HTML/CSS/JavaScript, dua backend microservice Node.js, dan MySQL.

## Anggota Kelompok

- Muhammad Randy Maulana
- Sofyan Al-Buqori Ramli
- Hafiz Izzan Zaafarani
- Exan Nabil Rifai
- Cikal Fachri Amanta

## Arsitektur

- **Book Service** pada `http://localhost:3000` mengelola katalog serta status buku di tabel `buku`.
- **Borrow Service** pada `http://localhost:3001` mengelola transaksi pinjam-kembali di tabel `peminjaman` dan validasi mahasiswa di tabel `mahasiswa`.
- Saat meminjam atau mengembalikan buku, Borrow Service memanggil endpoint Book Service melalui HTTP untuk membaca ketersediaan dan mengubah status buku. Borrow Service tidak mengubah status buku langsung di database.
- Kedua service memakai MySQL `uinsi_library`. Tidak ada file JSON atau array in-memory sebagai penyimpanan utama.

```text
Frontend
  |-- GET buku / status --------------------> Book Service :3000 --> MySQL
  `-- pinjam / kembali / daftar transaksi --> Borrow Service :3001 --> MySQL
                                                    |
                                                    `-- HTTP /books/:id/borrow|return --> Book Service :3000
```

## Struktur

```text
Vibe-Coding-Kelompok-3/
├── index.html
├── package.json
├── script.js
├── style.css
├── uinsi_library.sql
├── docs/
│   ├── architecture.md
│   └── testing.md
└── service/
    ├── .env.example
    ├── package.json
    ├── package-lock.json
    ├── postman/UINSI-Library-Microservices.postman_collection.json
    ├── book-service/
    │   ├── db.js
    │   ├── server.js
    │   ├── test-db.js
    │   └── routes/books.js
    └── borrow-service/
        ├── db.js
        ├── server.js
      ├── test-db.js
        ├── routes/peminjaman.js
        └── script.js
```

`service/borrow-service/script.js` tetap menjadi client frontend yang digunakan oleh `index.html`; backend Borrow Service berada di `server.js` dan `routes/peminjaman.js`.

## Database

Import `uinsi_library.sql` ke MySQL jika database belum tersedia. Buat `service/.env` dari `service/.env.example` bila konfigurasi lokal berbeda:

```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=uinsi_library
DB_USERNAME=root
DB_PASSWORD=
```

## Menjalankan

Dari folder `service/`, jalankan kedua service sekaligus:

```powershell
npm install
npm start
```

Book Service tersedia di port `3000`, Borrow Service di port `3001`. Untuk membuka frontend, jalankan Live Server dari root project lalu buka `index.html`.
Setelah dependency service terpasang, `npm start` dari root project juga meneruskan perintah ke `service/`.

## Endpoint

Book Service (`http://localhost:3000`):

| Method | Path | Fungsi |
|---|---|---|
| GET | `/health` | Status service dan koneksi MySQL |
| GET | `/books` | Daftar semua buku |
| GET | `/books/:id` | Detail buku |
| PATCH | `/books/:id/borrow` | Tandai buku dipinjam; dipanggil Borrow Service |
| PATCH | `/books/:id/return` | Tandai buku tersedia; dipanggil Borrow Service |
| GET | `/books/available` | Daftar buku tersedia |
| POST | `/books` | Tambah buku |
| DELETE | `/books/:id` | Hapus buku yang tidak dipinjam dan belum punya riwayat |

Borrow Service (`http://localhost:3001`):

| Method | Path | Fungsi |
|---|---|---|
| GET | `/health` | Status service dan koneksi MySQL |
| GET | `/peminjaman` | Semua transaksi |
| GET | `/peminjaman?studentId=S001` | Transaksi mahasiswa tertentu |
| POST | `/peminjaman` | Buat transaksi dan minta Book Service mengubah status buku |
| PATCH | `/peminjaman/:id/kembalikan` | Kembalikan transaksi aktif; `:id` menerima `recordId` atau ID numerik |

## Postman

Import collection `service/postman/UINSI-Library-Microservices.postman_collection.json`. Jalankan request berurutan. Atur `studentId` ke mahasiswa terdaftar dan `bookId` ke buku dengan status `tersedia` (collection memakai ID `5`).

1. `GET http://localhost:3000/health`
2. `GET http://localhost:3001/health`
3. `GET http://localhost:3000/books`
4. `GET http://localhost:3001/peminjaman`
5. `POST http://localhost:3001/peminjaman` dengan body JSON:

```json
{
  "studentId": "S001",
  "bookId": 1
}
```

Simpan `data.recordId` dari respons. Periksa bahwa `GET http://localhost:3000/books/1` sekarang menunjukkan `status: "dipinjam"`; ini membuktikan Borrow Service memanggil Book Service melalui HTTP.

6. `PATCH http://localhost:3001/peminjaman/{{recordId}}/kembalikan` dengan body:

```json
{
  "studentId": "S001"
}
```

Pastikan status transaksi menjadi `returned` dan status buku kembali `tersedia`. Contoh pengujian aturan bisnis lainnya ada di [docs/testing.md](docs/testing.md).