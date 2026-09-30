import express from "express";
import rateLimit from "express-rate-limit";
import env from "../config/env";
import { verifyToken } from "../controllers/auth";
import {
  createCategory,
  deleteCategory,
  getCategories,
  getCategoryById,
  updateCategory,
} from "../controllers/categories";
import validate from "../middleware/validate";
import { validateCategoryName } from "../validation/categories";

const router = express.Router();

const limiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  limit: 100,
  skip: () => env.nodeEnv === "test",
});

router.use(limiter);

router.use(verifyToken);

router.get("/", validate, getCategories);

router.get("/:id", getCategoryById);

router.post(
  "/",
  // Validation middleware
  validateCategoryName(),
  // Route handler
  createCategory,
);

router.patch(
  "/:id",
  // Validation middleware
  validateCategoryName(),
  // Route handler
  updateCategory,
);

router.delete("/:id", deleteCategory);

export default router;
