const patientNotesRouter = require("./patientNotes.js");
const express = require('express');
const adminRouter = require("./admin.js");
const userRouter = require("./user.js");
const authRouter = require("./auth.js");
const appointmentRouter = require("./appointment.js");
const branchRouter = require("./branch.js");
const feedbackRouter = require("./feedback.js")
const reportsRouter = require("./reports.js");
const messageRouter = require("./message.js");
const patientRouter = require("./patient.js");
const treatmentRouter = require("./treatment.js");
const patientAnamnesisRouter = require("./patientAnamnesis.js");
const treatmentTypeRouter = require("./treatmentType.js");
const treatmentPatientRouter = require("./treatmentPatient.js");
const smsRouter = require("./sms.js");
const priceListRouter = require("./priceList.js");

const router = express.Router();

router.use("/patient-notes", patientNotesRouter);
router.use("/admin", adminRouter);
router.use("/user", userRouter);
router.use("/auth", authRouter);
router.use("/appointment", appointmentRouter);
router.use("/branch", branchRouter);
router.use("/feedback", feedbackRouter);
router.use("/reports", reportsRouter);
router.use("/message", messageRouter);

router.use("/patient", patientRouter);
router.use("/patient-anamnesis", patientAnamnesisRouter);
router.use("/treatment-type", treatmentTypeRouter);
router.use("/treatment/patient", treatmentPatientRouter);
router.use("/treatment", treatmentRouter);
router.use("/sms", smsRouter);
router.use("/price-list", priceListRouter);    // Yeni eklendi



module.exports = router;
