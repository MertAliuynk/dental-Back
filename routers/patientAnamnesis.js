const express = require("express");
const { getAnamnesisByPatientId } = require("../helpers/db/queries/patientAnamnesisQueries");

const router = express.Router();

// Belirli hastanın anamnez bilgilerini getir
router.get("/:id", async (req, res) => {
  try {
    const anamnesis = await getAnamnesisByPatientId(req.params.id);
    res.json({ success: true, data: anamnesis });
  } catch (err) {
    res.status(500).json({ success: false, message: "Anamnez bilgileri alınamadı." });
  }
});

module.exports = router;
