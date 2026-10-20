const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
require("dotenv").config({
    path: require("path").resolve(__dirname, "../.env")
});

const db = require("./db");

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 3002;
const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    throw new Error("JWT_SECRET belum diatur di file service/.env");
}

app.post("/login", async (req, res) => {
    const { studentId, name } = req.body;

    if (!studentId || !name) {
        return res.status(400).json({
            message: "Student ID dan Name wajib diisi."
        });
    }

    try {
        const [rows] = await db.query(
            `SELECT id, username, nama, student_id
             FROM users
             WHERE student_id = ? AND LOWER(nama) = LOWER(?)`,
            [studentId, name]
        );

        if (rows.length === 0) {
            return res.status(401).json({
                message: "Student ID dan Name tidak cocok."
            });
        }

        const user = rows[0];

        const token = jwt.sign(
            {
                id: user.id,
                username: user.username,
                studentId: user.student_id
            },
            JWT_SECRET,
            {
                expiresIn: "2h"
            }
        );

        return res.json({
            message: "Login berhasil.",
            token,
            tokenType: "Bearer",
            expiresIn: 7200,
            data: {
                id: user.id,
                username: user.username,
                nama: user.nama,
                studentId: user.student_id
            }
        });
    } catch (error) {
        console.error("Gagal melakukan login:", error);

        return res.status(500).json({
            message: "Terjadi kesalahan pada server."
        });
    }
});

app.listen(PORT, () => {
    console.log(`Login Service berjalan di http://localhost:${PORT}`);
});