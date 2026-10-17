import express from "express";
import rateLimit from "express-rate-limit";
import db from "../config/db";
import env from "../config/env";

const router = express.Router();

const limiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  limit: 100,
  skip: () => env.nodeEnv === "test",
});

router.use(limiter);

router.get("/", async (_req, res, next) => {
  let timer: NodeJS.Timeout | undefined;

  try {
    // Check database connectivity with a timeout
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(
        () => reject(new Error("Database connection timed out")),
        5000,
      );
    });

    const dbQuery = db.any("SELECT 1");
    const result = await Promise.race([dbQuery, timeout]);

    if (!result) {
      throw new Error("Database connection failed");
    }

    return res.json({
      status: "ok",
    });
  } catch (error) {
    next(error);
  } finally {
    clearTimeout(timer);
  }
});

export default router;
