# Bug Report

## BUG-001 — Alur Peminjaman

### Deskripsi
Ditemukan potensi ketidaksesuaian pada alur peminjaman ketika frontend mengubah status buku secara langsung sebelum Borrow Service memproses transaksi.

### Dampak
Status buku dapat berubah lebih dahulu sehingga Borrow Service dapat membaca buku sebagai sudah dipinjam.

### Status
Ditemukan dan perlu diverifikasi melalui pengujian end-to-end.

## BUG-002 — Status Buku Tidak Berubah Saat Pengembalian

### Status
Fixed and Retested

### Langkah Menemukan Bug

1. Melakukan peminjaman buku Laskar Pelangi.
2. Record peminjaman berhasil dibuat dengan status `active`.
3. Status buku berubah menjadi `dipinjam`.
4. Melakukan proses pengembalian.
5. Record peminjaman berubah menjadi `returned`.
6. Namun status buku pada Book Service masih `dipinjam`.

### Dampak

Data Borrow Service dan Book Service menjadi tidak sinkron.

### Penyebab

Endpoint pengembalian pada Borrow Service mengubah record peminjaman
menjadi `returned` tanpa terlebih dahulu meminta Book Service mengubah status
buku menjadi `tersedia`.

### Perbaikan

Borrow Service sekarang memanggil:

`PATCH /books/:id/kembali`

ke Book Service sebelum record peminjaman diubah menjadi `returned`.

Record hanya diubah setelah Book Service berhasil memperbarui status buku.

### Hasil Retest

Setelah perbaikan:

- Record peminjaman → `returned` ✅
- Status buku → `tersedia` ✅
- Data antar-service kembali sinkron ✅