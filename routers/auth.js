const express = require("express");
const { getUserById, Register, login } = require("../controllers/auth");

const router = express.Router();


router.get("/user/:id", getUserById);
router.post("/register", Register);
router.post("/login", login);

// Test endpoint
router.get("/test", (req, res) => {
  res.send("Auth router çalışıyor");
});

module.exports = router;