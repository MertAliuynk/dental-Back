const express = require("express");
const { 
  getAllTreatmentTypes, 
  createTreatmentType, 
  updateTreatmentType, 
  deleteTreatmentType 
} = require("../controllers/treatmentType");

const router = express.Router();

// CRUD routes
router.get("/", getAllTreatmentTypes);           // Tüm tedavi türlerini getir
router.post("/", createTreatmentType);           // Yeni tedavi türü oluştur  
router.put("/:id", updateTreatmentType);         // Tedavi türünü güncelle
router.delete("/:id", deleteTreatmentType);      // Tedavi türünü sil

module.exports = router;
