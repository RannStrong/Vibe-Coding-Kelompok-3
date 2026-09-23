# Architecture Documentation

## 1. Architecture Sebelum Dikembangkan

Sebelum dikembangkan menjadi microservice, aplikasi perpustakaan menggunakan
HTML, CSS, dan JavaScript dengan penyimpanan data peminjaman menggunakan
localStorage pada browser.

Struktur sederhananya:

```text
User
  |
  v
Frontend
  |
  v
localStorage