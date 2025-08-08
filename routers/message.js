const express = require("express");

const router = express.Router();

// Test endpoint
router.get("/test", (req, res) => {
  res.send("Message router çalışıyor");
});

module.exports = router;