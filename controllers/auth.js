const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const db = require("../db");

const router = express.Router();

const tokenHeaderKey = process.env.TOKEN_HEADER_KEY;
const jwtSecretKey = process.env.JWT_SECRET_KEY;

const usernameRegex = /^[a-zA-Z0-9_]{3,30}$/;

if (!tokenHeaderKey || !jwtSecretKey) {
  throw new Error(
    "JWT_SECRET_KEY or TOKEN_HEADER_KEY is not defined in the environment variables",
  );
}

const signUp = async (req, res, next) => {
  const { username, password } = req.body || {};

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

  const passwordHash = await bcrypt.hash(password, 10);

  try {
    const user = await db.one(
      "INSERT INTO users(username, password_hash) VALUES($1, $2) RETURNING id, username",
      [username, passwordHash],
    );

    return res
      .status(201)
      .json({ message: "User registered successfully", user });
  } catch (err) {
    if (err.code === "23505") {
      // Handle unique constraint violation before the middleware does to avoid generic error response
      return res.status(409).json({ error: "Username already exists" });
    }

    return next(err);
  }
};

const login = async (req, res) => {
  const { username, password } = req.body || {};

  if (!username || !password) {
    return res
      .status(400)
      .json({ error: "Username and password are required" });
  }

  const user = await db.oneOrNone("SELECT * FROM users WHERE username = $1", [
    username,
  ]);

  if (!user) {
    return res.status(401).json({ error: "Invalid username or password" });
  }

  const isPasswordValid = await bcrypt.compare(password, user.password_hash);

  if (!isPasswordValid) {
    return res.status(401).json({ error: "Invalid username or password" });
  }

  const token = jwt.sign({ data: { username } }, jwtSecretKey, {
    expiresIn: "1h",
  });

  res.json({ token });
};

const verifyToken = (req, res) => {
  try {
    const authHeader = req.header(tokenHeaderKey);
    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.slice(7)
      : authHeader;

    const verified = jwt.verify(token, jwtSecretKey);

    return res.status(200).send({ valid: true, data: verified.data });
  } catch (err) {
    res.status(401).json({ valid: false, error: "Invalid or expired token" });
  }
};

module.exports = {
  signUp,
  login,
  verifyToken,
};
