# Bug Report

## BUG-001 — Alur Peminjaman

### Deskripsi
Ditemukan potensi ketidaksesuaian pada alur peminjaman ketika frontend mengubah status buku secara langsung sebelum Borrow Service memproses transaksi.

### Dampak
Status buku dapat berubah lebih dahulu sehingga Borrow Service dapat membaca buku sebagai sudah dipinjam.

### Status
Ditemukan dan perlu diverifikasi melalui pengujian end-to-end.