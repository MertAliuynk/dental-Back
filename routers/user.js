const express = require("express");
const { 
  getAllDoctors, 
  getAllUsers, 
  createUser, 
  updateUser, 
  deleteUser 
} = require("../controllers/user");
const { getUserById } = require("../controllers/auth");

const router = express.Router();

// Doktor listesi (tüm şubeler)
router.get("/doctors", getAllDoctors);
// Sadece giriş yapan kullanıcının şubesindeki doktorlar
router.get("/doctors/by-branch", require("../middlewares/auth/jwtAuth"), require("../controllers/user").getDoctorsByBranch);

// Admin routes
router.get("/", getAllUsers);           // Tüm kullanıcıları getir
router.post("/", createUser);           // Yeni kullanıcı oluştur
router.put("/:id", updateUser);         // Kullanıcı güncelle
router.delete("/:id", deleteUser);      // Kullanıcı sil

// Tek kullanıcı getir
router.get("/:id", getUserById);

module.exports = router;
