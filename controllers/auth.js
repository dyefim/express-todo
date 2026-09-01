const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

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

const mintAccessToken = (userId) =>
  jwt.sign({ data: { user_id: userId } }, jwtSecretKey, {
    expiresIn: "5m",
  });

const mintRefreshToken = (userId) => crypto.randomBytes(64).toString("hex");

const getRefreshTokenExpirationDate = () =>
  new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

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

  const token = mintAccessToken(user.id);

  const refreshToken = mintRefreshToken();

  const tokenExpirationDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await db.none(
    "INSERT INTO refresh_tokens(user_id, token_hash, expires_at) VALUES($1, $2, $3)",
    [user.id, await refreshToken, tokenExpirationDate],
  );
  await db.none("DELETE FROM refresh_tokens WHERE expires_at < now()");

  res.json({ token, refreshToken });
};

const refresh = async (req, res) => {
  const { refreshToken } = req.body || {};

  if (!refreshToken) {
    return res.status(400).json({ error: "Refresh token is required" });
  }

  const storedToken = await db.oneOrNone(
    "SELECT * FROM refresh_tokens WHERE token_hash = $1",
    [refreshToken],
  );

  if (!storedToken || storedToken.expires_at < new Date()) {
    return res.status(401).json({ error: "Invalid refresh token" });
  }

  const newAccessToken = mintAccessToken(storedToken.user_id);

  const newRefreshToken = mintRefreshToken();
  const tokenExpirationDate = getRefreshTokenExpirationDate();

  await db.none(
    "INSERT INTO refresh_tokens(user_id, token_hash, expires_at) VALUES($1, $2, $3)",
    [storedToken.user_id, newRefreshToken, tokenExpirationDate],
  );
  await db.none("DELETE FROM refresh_tokens WHERE id = $1", [storedToken.id]);

  res.json({ token: newAccessToken, refreshToken: newRefreshToken });
};

const verifyToken = (req, res, next) => {
  try {
    const authHeader = req.header(tokenHeaderKey);
    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.slice(7)
      : authHeader;

    req.user = jwt.verify(token, jwtSecretKey).data;
    next();
  } catch (err) {
    res.status(401).json({ valid: false, error: "Invalid or expired token" });
  }
};

module.exports = {
  signUp,
  login,
  refresh,
  verifyToken,
};
