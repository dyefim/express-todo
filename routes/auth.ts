import express from "express";
import rateLimit from "express-rate-limit";
import env from "../config/env";
import { login, refresh, signUp, verifyToken } from "../controllers/auth";

const router = express.Router();

const limiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  limit: 10,
  skip: () => env.nodeEnv === "test",
});

router.use(limiter);

router.post("/sign-up", signUp);

router.post("/login", login);

router.post("/refresh", refresh);

router.get("/verify", verifyToken, (req, res) =>
  res.status(200).json({ valid: true, data: req.user }),
);

export default router;
