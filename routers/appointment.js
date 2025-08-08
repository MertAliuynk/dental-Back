const express = require("express");
const router = express.Router();
const { getAppointments, createAppointment, updateAppointmentDuration, updateAppointmentTime, updateAppointmentTimeAndDuration, deleteAppointment, updateAppointmentNotes, updateAppointmentStatus } = require("../controllers/appointment");

// GET /api/appointment - Tüm randevuları getir
router.get("/", getAppointments);
// POST /api/appointment - Yeni randevu oluştur
router.post("/", createAppointment);
// PATCH /api/appointment/:id/duration
router.patch("/:id/duration", updateAppointmentDuration);
// PATCH /api/appointment/:id/time
router.patch("/:id/time", updateAppointmentTime);
// PATCH /api/appointment/:id/time-duration - Drag & Drop için hem saat hem süre güncelleme
router.patch("/:id/time-duration", updateAppointmentTimeAndDuration);
// PUT /api/appointment/:id - Durum güncelleme
router.put("/:id", updateAppointmentStatus);
// DELETE /api/appointment/:id - Randevu silme
router.delete("/:id", deleteAppointment);
// PATCH /api/appointment/:id/notes - Not güncelleme
router.patch("/:id/notes", updateAppointmentNotes);

module.exports = router;