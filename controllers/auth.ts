import crypto from "node:crypto";
import type { Varchar } from "@prisma/orm-postgres/target/codec-types";
import bcrypt from "bcryptjs";
import type { RequestHandler } from "express";
import jwt from "jsonwebtoken";

import env from "../config/env";
import { db as prismaDB } from "../prisma/db";

const tokenHeaderKey = env.tokenHeaderKey;
const jwtSecretKey = env.jwtSecretKey;

const usernameRegex = /^[a-zA-Z0-9_]{3,30}$/;

const mintAccessToken = (userId: number) =>
  jwt.sign({ data: { id: userId } }, jwtSecretKey, {
    expiresIn: "5m",
  });

export const mintRefreshToken = () => crypto.randomBytes(64).toString("hex");

const getRefreshTokenExpirationDate = () =>
  new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

export const signUp: RequestHandler = async (req, res, next) => {
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
    const user = await prismaDB.orm.public.Users.create({
      username,
      passwordHash: passwordHash as Varchar<255>,
    });

    return res.status(201).json({
      message: "User registered successfully",
      user: { id: user.id, username: user.username },
    });
  } catch (err) {
    if ((err as { sqlState?: string }).sqlState === "23505") {
      // Handle unique constraint violation before the middleware does to avoid generic error response
      return res.status(409).json({ error: "Username already exists" });
    }

    return next(err);
  }
};

export const login: RequestHandler = async (req, res) => {
  const { username, password } = req.body || {};

  if (!username || !password) {
    return res
      .status(400)
      .json({ error: "Username and password are required" });
  }

  const user = await prismaDB.orm.public.Users.where({
    username,
  }).first();

  if (!user) {
    return res.status(401).json({ error: "Invalid username or password" });
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

  if (!isPasswordValid) {
    return res.status(401).json({ error: "Invalid username or password" });
  }

  const token = mintAccessToken(user.id);

  const refreshToken = mintRefreshToken();

  const tokenExpirationDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await prismaDB.orm.public.RefreshTokens.create({
    userId: user.id,
    tokenHash: refreshToken as Varchar<255>,
    expiresAt: tokenExpirationDate,
  });

  await prismaDB.orm.public.RefreshTokens.where((t) =>
    t.expiresAt.lt(new Date()),
  ).deleteAndCount();

  res.json({ token, refreshToken });
};

export const refresh: RequestHandler = async (req, res) => {
  const { refreshToken } = req.body || {};

  if (!refreshToken) {
    return res.status(400).json({ error: "Refresh token is required" });
  }

  const storedToken = await prismaDB.orm.public.RefreshTokens.where({
    tokenHash: refreshToken,
  }).first();

  if (!storedToken || storedToken.expiresAt < new Date()) {
    return res.status(401).json({ error: "Invalid refresh token" });
  }

  const newAccessToken = mintAccessToken(storedToken.userId);

  const newRefreshToken = mintRefreshToken();
  const tokenExpirationDate = getRefreshTokenExpirationDate();

  const rotated = await prismaDB.transaction(async (tx) => {
    const consumed = await tx.orm.public.RefreshTokens.where({
      id: storedToken.id,
    }).deleteAndCount();

    if (consumed === 0) return false;

    await tx.orm.public.RefreshTokens.create({
      userId: storedToken.userId,
      tokenHash: newRefreshToken as Varchar<255>,
      expiresAt: tokenExpirationDate,
    });

    return true;
  });

  if (!rotated) {
    return res.status(401).json({ error: "Invalid refresh token" });
  }

  res.json({ token: newAccessToken, refreshToken: newRefreshToken });
};

export const verifyToken: RequestHandler = (req, res, next) => {
  try {
    const authHeader = req.header(tokenHeaderKey);

    if (!authHeader) {
      return res
        .status(401)
        .json({ valid: false, error: "Missing authorization header" });
    }

    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.slice(7)
      : authHeader;

    const decoded = jwt.verify(token, jwtSecretKey) as { data: AuthUser };

    req.user = decoded.data;
    next();
  } catch (_err) {
    res.status(401).json({ valid: false, error: "Invalid or expired token" });
  }
};
