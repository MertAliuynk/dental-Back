const express = require("express");
const router = express.Router();
const pool = require("../helpers/db/utils/dbClient");

// Tüm doktor sıralarını getir
router.get("/doctor-order", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM doctor_order ORDER BY order_num ASC");
    res.json({ success: true, data: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, message: "Sıra listesi alınamadı.", error: err.message });
  }
});

// Yeni doktor sırası ekle
router.post("/doctor-order", async (req, res) => {
  try {
    const { doctor_id, order_num } = req.body;
    if (!doctor_id || typeof order_num !== "number") {
      return res.status(400).json({ success: false, message: "doctor_id ve order_num zorunlu." });
    }
    const result = await pool.query(
      "INSERT INTO doctor_order (doctor_id, order_num) VALUES ($1, $2) RETURNING *",
      [doctor_id, order_num]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: "Ekleme hatası.", error: err.message });
  }
});

// Doktor sırasını güncelle
router.put("/doctor-order/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { doctor_id, order_num } = req.body;
    if (!doctor_id || typeof order_num !== "number") {
      return res.status(400).json({ success: false, message: "doctor_id ve order_num zorunlu." });
    }
    const result = await pool.query(
      "UPDATE doctor_order SET doctor_id = $1, order_num = $2 WHERE id = $3 RETURNING *",
      [doctor_id, order_num, id]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    res.status(500).json({ success: false, message: "Güncelleme hatası.", error: err.message });
  }
});

// Doktor sırasını sil
router.delete("/doctor-order/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await pool.query("DELETE FROM doctor_order WHERE id = $1", [id]);
    res.json({ success: true, message: "Sıra silindi." });
  } catch (err) {
    res.status(500).json({ success: false, message: "Silme hatası.", error: err.message });
  }
});

module.exports = router;
