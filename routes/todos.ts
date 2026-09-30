import express from "express";
import rateLimit from "express-rate-limit";
import env from "../config/env";
import { verifyToken } from "../controllers/auth";
import {
  createTodo,
  deleteTodo,
  getTodoById,
  getTodos,
  updateTodo,
} from "../controllers/todos";
import validate from "../middleware/validate";
import {
  validateCategories,
  validateDone,
  validateTaskName,
} from "../validation/todos";


const router = express.Router();

const limiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  limit: 100,
  skip: () => env.nodeEnv === "test",
});

router.use(limiter);

router.use(verifyToken);

router.get("/", validate, getTodos);

router.get("/:id", getTodoById);

router.post(
  "/",
  // Validation middleware
  validateTaskName({ required: true }),
  validateCategories,
  validateDone,
  validate,
  // Route handler
  createTodo,
);

router.patch(
  "/:id",
  // Validation middleware
  validateTaskName(),
  validateCategories,
  validateDone,
  validate,
  // Route handler
  updateTodo,
);

router.delete("/:id", deleteTodo);

export = router;
