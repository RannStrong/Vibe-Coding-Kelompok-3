const db = require("./db");

async function testConnection() {
  try {
    const [rows] = await db.query("SELECT 1 AS connected");
    console.log("Borrow Service MySQL connection:", rows[0].connected);
  } catch (error) {
    console.error("Borrow Service MySQL connection failed:", error.message);
    process.exitCode = 1;
  } finally {
    await db.end();
  }
}

testConnection();