const express = require("express");
const {
  getSmsTemplates,
  createSmsTemplate,
  updateSmsTemplate,
  deleteSmsTemplate,
  sendQuickSms,
  scheduleSms,
  getScheduledSms
} = require("../controllers/sms");

const router = express.Router();

// SMS Şablon işlemleri
router.get("/templates", getSmsTemplates);
router.post("/templates", createSmsTemplate);
router.put("/templates/:id", updateSmsTemplate);
router.delete("/templates/:id", deleteSmsTemplate);

// SMS gönderme işlemleri
router.post("/send", sendQuickSms);
router.post("/schedule", scheduleSms);
router.get("/scheduled", getScheduledSms);

module.exports = router;
