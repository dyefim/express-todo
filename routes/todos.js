const express = require("express");
const rateLimit = require("express-rate-limit");

const { validateTaskName, validateDone } = require("../validation/todos");
const validate = require("../middleware/validate");
const { verifyToken } = require("../controllers/auth");
const {
  getTodos,
  getTodoById,
  createTodo,
  updateTodo,
  deleteTodo,
} = require("../controllers/todos");

const router = express.Router();

const limiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  limit: 100,
});

router.use(limiter);

router.use(verifyToken);

router.get("/", getTodos);

router.get("/:id", getTodoById);

router.post(
  "/",
  // Validation middleware
  validateTaskName({ required: true }),
  validateDone,
  validate,
  // Route handler
  createTodo,
);

router.patch(
  "/:id",
  // Validation middleware
  validateTaskName(),
  validateDone,
  validate,
  // Route handler
  updateTodo,
);

router.delete("/:id", deleteTodo);

module.exports = router;
