const express = require("express");
const cors = require("cors");
require("dotenv").config();

const db = require("./db");

const app = express();

app.use(cors());
app.use(express.json());

const PORT = 3002;

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

        res.json({
            message: "Login berhasil.",
            data: {
                id: user.id,
                username: user.username,
                nama: user.nama,
                studentId: user.student_id
            }
        });

    } catch (error) {
        console.error("Gagal melakukan login:");
        console.error(error);

        res.status(500).json({
            message: "Terjadi kesalahan pada server."
        });
    }
});

app.listen(PORT, () => {
    console.log(`Login Service berjalan di http://localhost:${PORT}`);
});