# Dokumentasi Testing

## Tujuan
Melakukan pengujian terhadap aplikasi perpustakaan setelah dikembangkan menjadi microservice.

## Fitur yang Diuji

1. Book Service
2. Borrow Service
3. Komunikasi antar-service
4. Frontend
5. Peminjaman
6. Pengembalian

## Status Pengujian

Pengujian lanjutan dilakukan setelah seluruh service dijalankan secara bersamaan.

## Hasil Pengujian End-to-End

| No | Skenario | Hasil |
|---|---|---|
| 1 | Book Service dapat diakses | PASS |
| 2 | Borrow Service dapat diakses | PASS |
| 3 | Menampilkan daftar buku dari Book Service | PASS |
| 4 | Peminjaman buku tersedia | PASS |
| 5 | Status buku berubah menjadi dipinjam | PASS |
| 6 | Data peminjaman tersimpan pada Borrow Service | PASS |
| 7 | Pengembalian buku | PASS |
| 8 | Status peminjaman berubah menjadi returned | PASS |
| 9 | Status buku kembali menjadi tersedia setelah perbaikan | PASS |

## Temuan Bug Saat Testing

Ditemukan ketidaksesuaian antara Borrow Service dan Book Service saat proses
pengembalian.

Sebelum perbaikan:
- Record peminjaman berubah menjadi `returned`.
- Status buku di Book Service masih `dipinjam`.

Setelah perbaikan:
- Record peminjaman berubah menjadi `returned`.
- Status buku berubah menjadi `tersedia`.

Dengan demikian, hasil pengujian ulang menunjukkan bahwa data antar-service
sudah konsisten pada alur pengembalian.

