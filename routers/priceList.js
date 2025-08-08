const express = require("express");
const { 
  getAllPriceLists, 
  getPriceListDetails,
  createPriceList, 
  updatePriceList, 
  deletePriceList,
  togglePriceListStatus
} = require("../controllers/priceList");

const router = express.Router();

// CRUD routes
router.get("/", getAllPriceLists);                    // Tüm fiyat listelerini getir
router.get("/:id", getPriceListDetails);              // Fiyat listesi detayını getir
router.post("/", createPriceList);                    // Yeni fiyat listesi oluştur
router.put("/:id", updatePriceList);                  // Fiyat listesini güncelle
router.delete("/:id", deletePriceList);               // Fiyat listesini sil
router.patch("/:id/toggle", togglePriceListStatus);   // Aktif/Pasif durumu değiştir

module.exports = router;
