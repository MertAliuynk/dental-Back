const express = require("express");
const {
  getPendingFeedbacks,
  getFeedbackHistory,
  createFeedback,
  updateFeedback
} = require("../controllers/feedback");

const router = express.Router();

// Bekleyen geri dönüşleri getir
router.get("/pending", getPendingFeedbacks);

// Geri dönüş geçmişini getir
router.get("/history", getFeedbackHistory);

// Yeni geri dönüş oluştur
router.post("/", createFeedback);

// Geri dönüş güncelle
router.put("/:id", updateFeedback);

module.exports = router;