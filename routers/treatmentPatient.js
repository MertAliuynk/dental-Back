const express = require("express");
const { getTreatmentsByPatient } = require("../helpers/db/queries/treatmentQueries");

const router = express.Router();

// Belirli hastanın tedavilerini getir
router.get("/:id", async (req, res) => {
  try {
    const treatments = await getTreatmentsByPatient(req.params.id);
    res.json({ success: true, data: treatments });
  } catch (err) {
    res.status(500).json({ success: false, message: "Tedaviler alınamadı." });
  }
});

module.exports = router;
