const express = require("express");

const { signUp, login, refresh, verifyToken } = require("../controllers/auth");

const router = express.Router();

router.post("/sign-up", signUp);

router.post("/login", login);

router.post("/refresh", refresh);

router.get("/verify", verifyToken, (req, res) =>
  res.status(200).json({ valid: true, data: req.user }),
);

module.exports = router;
