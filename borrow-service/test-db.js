const db = require("./db");

async function testConnection() {
    try {
        const [rows] = await db.query("SELECT 1 AS berhasil");

        console.log("Database Borrow Service berhasil terhubung!");
        console.log(rows);
    } catch (error) {
        console.error("Gagal terhubung ke database:");
        console.error(error.message);
    } finally {
        process.exit();
    }
}

testConnection();