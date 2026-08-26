const express = require("express");
const jwt = require("jsonwebtoken");

const router = express.Router();

const tokenHeaderKey = process.env.TOKEN_HEADER_KEY;
const jwtSecretKey = process.env.JWT_SECRET_KEY;

const usernameRegex = /^[a-zA-Z0-9_]{3,30}$/;

if (!tokenHeaderKey || !jwtSecretKey) {
  throw new Error(
    "JWT_SECRET_KEY or TOKEN_HEADER_KEY is not defined in the environment variables",
  );
}

router.post("/login", (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res
      .status(400)
      .json({ error: "Username and password are required" });
  }

  if (username.length < 3 || username.length > 30) {
    return res
      .status(400)
      .json({ error: "Username must be between 3 and 30 characters" });
  }

  if (!usernameRegex.test(username)) {
    return res.status(400).json({ error: "Invalid username format" });
  }

  if (password.length < 6) {
    return res
      .status(400)
      .json({ error: "Password must be at least 6 characters long" });
  }

  const token = jwt.sign({ data: { username } }, jwtSecretKey, {
    expiresIn: "1h",
  });

  res.json({ token });
});

router.get("/verify", (req, res) => {
  try {
    const authHeader = req.header(tokenHeaderKey);
    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.slice(7)
      : authHeader;

    const verified = jwt.verify(token, jwtSecretKey);

    return res.status(200).send({ valid: true, data: verified.data });
  } catch (err) {
    console.error("Token verification failed:", err.message);

    res.status(401).json({ valid: false, error: "Invalid or expired token" });
  }
});

module.exports = router;
