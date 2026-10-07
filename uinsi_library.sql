-- =========================================================
-- DATABASE UINSI LIBRARY
-- Untuk project Vibe-Coding-Kelompok-3
-- Import file ini melalui phpMyAdmin
-- =========================================================

CREATE DATABASE IF NOT EXISTS uinsi_library
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE uinsi_library;

-- Hapus tabel jika sebelumnya pernah dibuat
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS peminjaman;
DROP TABLE IF EXISTS buku;
DROP TABLE IF EXISTS mahasiswa;
SET FOREIGN_KEY_CHECKS = 1;

-- =========================================================
-- TABEL MAHASISWA
-- =========================================================
CREATE TABLE mahasiswa (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    student_id VARCHAR(10) NOT NULL UNIQUE,
    nama VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Data mahasiswa sesuai roster pada frontend
INSERT INTO mahasiswa (student_id, nama) VALUES
('S001', 'Randy'),
('S002', 'Raihan'),
('S003', 'Elsa'),
('S004', 'uinsi');

-- =========================================================
-- TABEL BUKU
-- =========================================================
CREATE TABLE buku (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    judul VARCHAR(255) NOT NULL,
    penulis VARCHAR(150) NOT NULL,
    tahun SMALLINT UNSIGNED NULL,
    status ENUM('tersedia', 'dipinjam') NOT NULL DEFAULT 'tersedia',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Data buku sama seperti library-service/data/books.json
INSERT INTO buku (id, judul, penulis, tahun, status) VALUES
(1, 'Laskar Pelangi', 'Andrea Hirata', 2005, 'tersedia'),
(2, 'Bumi Manusia', 'Pramoedya Ananta Toer', 1980, 'dipinjam'),
(3, 'Negeri 5 Menara', 'Ahmad Fuadi', 2009, 'dipinjam'),
(4, 'Filosofi Kopi', 'Dee Lestari', 2006, 'dipinjam'),
(5, 'Sang Pemimpi', 'Andrea Hirata', 2006, 'tersedia');

-- =========================================================
-- TABEL PEMINJAMAN
-- =========================================================
CREATE TABLE peminjaman (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    record_id VARCHAR(20) NOT NULL UNIQUE,
    mahasiswa_id INT UNSIGNED NOT NULL,
    buku_id INT UNSIGNED NOT NULL,
    tanggal_pinjam DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    tanggal_jatuh_tempo DATETIME NOT NULL,
    tanggal_kembali DATETIME NULL,
    status ENUM('active', 'returned') NOT NULL DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_peminjaman_mahasiswa
        FOREIGN KEY (mahasiswa_id) REFERENCES mahasiswa(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_peminjaman_buku
        FOREIGN KEY (buku_id) REFERENCES buku(id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
) ENGINE=InnoDB;

-- Contoh data peminjaman awal untuk mencerminkan
-- status buku 2, 3, dan 4 yang sebelumnya "dipinjam".
-- Data ini menggunakan mahasiswa S001 sebagai peminjam contoh.
INSERT INTO peminjaman
(record_id, mahasiswa_id, buku_id, tanggal_pinjam, tanggal_jatuh_tempo, status)
VALUES
('R1', 1, 2, NOW(), DATE_ADD(NOW(), INTERVAL 7 DAY), 'active'),
('R2', 1, 3, NOW(), DATE_ADD(NOW(), INTERVAL 7 DAY), 'active'),
('R3', 1, 4, NOW(), DATE_ADD(NOW(), INTERVAL 7 DAY), 'active');

-- =========================================================
-- VIEW UNTUK MELIHAT DATA PEMINJAMAN LENGKAP
-- =========================================================
CREATE OR REPLACE VIEW v_peminjaman_lengkap AS
SELECT
    p.id,
    p.record_id,
    m.student_id,
    m.nama AS nama_mahasiswa,
    b.id AS book_id,
    b.judul,
    b.penulis,
    b.tahun,
    p.tanggal_pinjam,
    p.tanggal_jatuh_tempo,
    p.tanggal_kembali,
    p.status
FROM peminjaman p
JOIN mahasiswa m ON p.mahasiswa_id = m.id
JOIN buku b ON p.buku_id = b.id;

-- =========================================================
-- CEK HASIL
-- =========================================================
SELECT * FROM mahasiswa;
SELECT * FROM buku;
SELECT * FROM v_peminjaman_lengkap;
