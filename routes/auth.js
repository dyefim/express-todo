const express = require("express");
const rateLimit = require("express-rate-limit");

const { signUp, login, refresh, verifyToken } = require("../controllers/auth");

const router = express.Router();

const limiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  limit: 10,
});

router.use(limiter);

router.post("/sign-up", signUp);

router.post("/login", login);

router.post("/refresh", refresh);

router.get("/verify", verifyToken, (req, res) =>
  res.status(200).json({ valid: true, data: req.user }),
);

module.exports = router;
