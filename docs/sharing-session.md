# Sharing Session — Vibe Coding Kelompok 3

## 1. Architecture Sebelum Dikembangkan

Sebelum menggunakan microservice, aplikasi perpustakaan dibuat menggunakan
HTML, CSS, JavaScript, dan localStorage.

Pada arsitektur awal, frontend menangani tampilan dan sebagian data
peminjaman secara langsung pada browser.

```text
User
  |
  v
Frontend
  |
  v
localStorage