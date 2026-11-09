// ========================================
// 1. เรียกใช้งาน SQLite
// ========================================

const Database = require("better-sqlite3");
const path = require("path");

// สร้างหรือเปิดไฟล์ฐานข้อมูล fastcondo.db
// ไฟล์ฐานข้อมูลจะอยู่ในโฟลเดอร์เดียวกับ database.js
const dbPath = path.join(__dirname, "fastcondo.db");
const db = new Database(dbPath);

// เปิดใช้ Foreign Key ของ SQLite
db.pragma("foreign_keys = ON");

// ========================================
// 2. สร้างตาราง condos
// ========================================

// สร้างตารางเฉพาะกรณีที่ยังไม่มีตารางนี้
db.exec(`
  CREATE TABLE IF NOT EXISTS condos (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    location TEXT NOT NULL,
    price INTEGER NOT NULL CHECK (price >= 0)
  )
`);

// ========================================
// 3. เพิ่มข้อมูลคอนโดตัวอย่าง
// ========================================

// ตรวจสอบว่ามีข้อมูลในตารางแล้วหรือไม่
const condoCount = db
  .prepare("SELECT COUNT(*) AS total FROM condos")
  .get();

// เพิ่มข้อมูลตัวอย่างเฉพาะตอนที่ตารางยังว่าง
if (condoCount.total === 0) {
  const insertCondo = db.prepare(`
    INSERT INTO condos (id, name, location, price)
    VALUES (@id, @name, @location, @price)
  `);

  // ใช้ Transaction เพื่อเพิ่มข้อมูลทั้งหมดเป็นชุดเดียว
  const insertSampleCondos = db.transaction(function () {
    insertCondo.run({
      id: 1,
      name: "สุขุมวิท เรสซิเดนซ์",
      location: "อโศก",
      price: 12000
    });

    insertCondo.run({
      id: 2,
      name: "ซิตี้ คอนโด",
      location: "พร้อมพงษ์",
      price: 18000
    });

    insertCondo.run({
      id: 3,
      name: "อ่อนนุช ลิฟวิ่ง",
      location: "อ่อนนุช",
      price: 9000
    });
  });

  insertSampleCondos();

  console.log("เพิ่มข้อมูลคอนโดตัวอย่างสำเร็จ");
}

// ========================================
// 4. ส่งออกฐานข้อมูลเพื่อให้ไฟล์อื่นใช้งาน
// ========================================

module.exports = db;