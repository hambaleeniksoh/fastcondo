
const express = require("express");
const path = require("path");

// เชื่อมต่อฐานข้อมูล SQLite
const db = require("./database");

const app = express();
const PORT = 3000;

// ========================================
// 1. Middleware
// ========================================

// อ่าน JSON ที่ Frontend ส่งมา
app.use(express.json());

// ป้องกันไม่ให้ผู้ใช้ดาวน์โหลดไฟล์ Database โดยตรง
app.use("/fastcondo.db", function (req, res) {
  res.status(403).json({
    message: "ไม่อนุญาตให้เข้าถึงไฟล์ฐานข้อมูล"
  });
});

// เปิดให้ Frontend เรียกใช้ไฟล์ HTML, CSS และ JavaScript
app.use(express.static(__dirname));


// ========================================
// 2. หน้าแรก
// GET /
// ========================================

app.get("/", function (req, res) {
  res.sendFile(path.join(__dirname, "index.html"));
});


// ========================================
// 3. อ่านคอนโดทั้งหมด
// GET /api/condos
// ========================================

app.get("/api/condos", function (req, res) {
  try {
    const condos = db.prepare(
      "SELECT * FROM condos ORDER BY id ASC"
    ).all();

    res.json(condos);

  } catch (error) {
    console.error("อ่านข้อมูลคอนโดไม่สำเร็จ:", error);

    res.status(500).json({
      message: "ไม่สามารถอ่านข้อมูลคอนโดจาก Database ได้"
    });
  }
});


// ========================================
// 4. อ่านคอนโดรายรายการ
// GET /api/condos/:id
// ========================================

app.get("/api/condos/:id", function (req, res) {
  try {
    const condoId = Number(req.params.id);

    if (!Number.isSafeInteger(condoId) || condoId <= 0) {
      return res.status(400).json({
        message: "รหัสคอนโดไม่ถูกต้อง"
      });
    }

    const condo = db.prepare(
      "SELECT * FROM condos WHERE id = ?"
    ).get(condoId);

    if (!condo) {
      return res.status(404).json({
        message: "ไม่พบคอนโดที่ต้องการ"
      });
    }

    res.json(condo);

  } catch (error) {
    console.error("อ่านรายละเอียดคอนโดไม่สำเร็จ:", error);

    res.status(500).json({
      message: "ไม่สามารถอ่านรายละเอียดคอนโดได้"
    });
  }
});


// ========================================
// 5. ตรวจสอบข้อมูลคอนโด
// ใช้ร่วมกันใน POST และ PUT
// ========================================

function validateCondo(data) {
  // ป้องกันกรณีไม่ได้ส่ง JSON Object มา
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    return {
      valid: false,
      message: "รูปแบบข้อมูลไม่ถูกต้อง"
    };
  }

  const { name, location, price } = data;

  if (typeof name !== "string" || name.trim() === "") {
    return {
      valid: false,
      message: "กรุณาระบุชื่อคอนโด"
    };
  }

  if (
    typeof location !== "string" ||
    location.trim() === ""
  ) {
    return {
      valid: false,
      message: "กรุณาระบุทำเลคอนโด"
    };
  }

  if (
    price === undefined ||
    price === null ||
    price === "" ||
    !Number.isSafeInteger(Number(price)) ||
    Number(price) <= 0
  ) {
    return {
      valid: false,
      message: "ราคาต้องเป็นจำนวนเต็มมากกว่า 0 บาท"
    };
  }

  return {
    valid: true,
    data: {
      name: name.trim(),
      location: location.trim(),
      price: Number(price)
    }
  };
}


// ========================================
// 6. เพิ่มคอนโดใหม่
// POST /api/condos
// ========================================

app.post("/api/condos", function (req, res) {
  try {
    const validation = validateCondo(req.body);

    if (!validation.valid) {
      return res.status(400).json({
        message: validation.message
      });
    }

    const { name, location, price } = validation.data;

    // บันทึกข้อมูลลง SQLite
    const result = db.prepare(`
      INSERT INTO condos (name, location, price)
      VALUES (?, ?, ?)
    `).run(name, location, price);

    // อ่านข้อมูลที่เพิ่งเพิ่ม
    const newCondo = db.prepare(
      "SELECT * FROM condos WHERE id = ?"
    ).get(result.lastInsertRowid);

    res.status(201).json({
      message: "เพิ่มคอนโดสำเร็จ",
      condo: newCondo
    });

  } catch (error) {
    console.error("เพิ่มคอนโดไม่สำเร็จ:", error);

    res.status(500).json({
      message: "ไม่สามารถเพิ่มคอนโดได้"
    });
  }
});


// ========================================
// 7. แก้ไขข้อมูลคอนโด
// PUT /api/condos/:id
// ========================================

app.put("/api/condos/:id", function (req, res) {
  try {
    const condoId = Number(req.params.id);

    if (!Number.isSafeInteger(condoId) || condoId <= 0) {
      return res.status(400).json({
        message: "รหัสคอนโดไม่ถูกต้อง"
      });
    }

    const validation = validateCondo(req.body);

    if (!validation.valid) {
      return res.status(400).json({
        message: validation.message
      });
    }

    // ตรวจสอบว่ามีคอนโดนี้อยู่จริง
    const existingCondo = db.prepare(
      "SELECT id FROM condos WHERE id = ?"
    ).get(condoId);

    if (!existingCondo) {
      return res.status(404).json({
        message: "ไม่พบคอนโดที่ต้องการแก้ไข"
      });
    }

    const { name, location, price } = validation.data;

    // อัปเดตข้อมูล
    db.prepare(`
      UPDATE condos
      SET name = ?, location = ?, price = ?
      WHERE id = ?
    `).run(name, location, price, condoId);

    // อ่านข้อมูลหลังแก้ไข
    const updatedCondo = db.prepare(
      "SELECT * FROM condos WHERE id = ?"
    ).get(condoId);

    res.json({
      message: "แก้ไขข้อมูลคอนโดสำเร็จ",
      condo: updatedCondo
    });

  } catch (error) {
    console.error("แก้ไขคอนโดไม่สำเร็จ:", error);

    res.status(500).json({
      message: "ไม่สามารถแก้ไขข้อมูลคอนโดได้"
    });
  }
});


// ========================================
// 8. ลบคอนโด
// DELETE /api/condos/:id
// ========================================

app.delete("/api/condos/:id", function (req, res) {
  try {
    const condoId = Number(req.params.id);

    if (!Number.isSafeInteger(condoId) || condoId <= 0) {
      return res.status(400).json({
        message: "รหัสคอนโดไม่ถูกต้อง"
      });
    }

    // ตรวจสอบว่ามีคอนโดนี้อยู่จริง
    const existingCondo = db.prepare(
      "SELECT * FROM condos WHERE id = ?"
    ).get(condoId);

    if (!existingCondo) {
      return res.status(404).json({
        message: "ไม่พบคอนโดที่ต้องการลบ"
      });
    }

    // ลบข้อมูลจาก SQLite
    db.prepare(
      "DELETE FROM condos WHERE id = ?"
    ).run(condoId);

    res.json({
      message: "ลบคอนโดสำเร็จ",
      condo: existingCondo
    });

  } catch (error) {
    console.error("ลบคอนโดไม่สำเร็จ:", error);

    res.status(500).json({
      message: "ไม่สามารถลบคอนโดได้"
    });
  }
});


// ========================================
// 9. จัดการ Error จาก Express
// ========================================

// เช่น JSON ที่ส่งมามีรูปแบบไม่ถูกต้อง
app.use(function (error, req, res, next) {
  console.error("Express Error:", error);

  if (res.headersSent) {
    return next(error);
  }

  if (error instanceof SyntaxError && error.status === 400) {
    return res.status(400).json({
      message: "JSON ที่ส่งมามีรูปแบบไม่ถูกต้อง"
    });
  }

  res.status(500).json({
    message: "เกิดข้อผิดพลาดภายใน Server"
  });
});


// ========================================
// 10. เริ่มต้น Server
// ========================================

const server = app.listen(PORT, function () {
  console.log("Fastcondo is running at http://localhost:" + PORT);
  console.log("SQLite Database พร้อมใช้งาน");
});


// ========================================
// 11. ปิด Server และ Database
// ========================================

let isShuttingDown = false;

function shutdown() {
  // ป้องกันการสั่งปิดซ้ำ
  if (isShuttingDown) return;

  isShuttingDown = true;

  server.close(function () {
    try {
      db.close();
      console.log("ปิด Server และ Database เรียบร้อย");
      process.exit(0);

    } catch (error) {
      console.error("เกิดข้อผิดพลาดขณะปิด Database:", error);
      process.exit(1);
    }
  });
}

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
