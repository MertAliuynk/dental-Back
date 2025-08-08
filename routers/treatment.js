const express = require("express");
const {
  getAllTreatments,
  getTreatmentById,
  createTreatment,
  updateTreatmentStatus,
  deleteTreatment
} = require("../controllers/treatment");

const router = express.Router();

// CRUD routes
router.get("/", getAllTreatments);                    // Tüm tedavileri getir (opsiyonel hasta ID filtresi ile)
router.get("/:id", getTreatmentById);                 // Belirli tedavi detayını getir
router.post("/", createTreatment);                    // Yeni tedavi öner
router.put("/:id/status", updateTreatmentStatus);     // Tedavi durumunu güncelle
router.delete("/:id", deleteTreatment);               // Tedavi sil

// Test endpoint
router.get("/test", (req, res) => {
  res.send("Treatment router çalışıyor");
});

module.exports = router;