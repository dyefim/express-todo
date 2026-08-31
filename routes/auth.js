const express = require("express");

const { signUp, login, verifyToken } = require("../controllers/auth");

const router = express.Router();

router.post("/sign-up", signUp);

router.post("/login", login);

router.get("/verify", verifyToken);

module.exports = router;
