const express = require("express");
const { getAllBranches, getDoctorsByBranch, createBranch, updateBranch, deleteBranch } = require("../controllers/branch");

const router = express.Router();

// Tüm şubeleri getir
router.get("/", getAllBranches);

// Şubedeki doktorları getir
router.get("/:branchId/doctors", getDoctorsByBranch);

// Şube CRUD
router.post('/', createBranch);
router.put('/:id', updateBranch);
router.delete('/:id', deleteBranch);

// Test endpoint
router.get("/test", (req, res) => {
  res.send("Branch router çalışıyor");
});

module.exports = router;