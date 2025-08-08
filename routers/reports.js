const express = require("express");
const router = express.Router();
const reportsController = require("../controllers/reports");

router.get("/examination", reportsController.getExaminationReport);
router.get("/doctor-appointment", reportsController.getDoctorAppointmentReport);
router.get("/treatment", reportsController.getTreatmentReport);

module.exports = router;
