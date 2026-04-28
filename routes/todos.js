const express = require("express");
const fs = require("fs");
const { validateTaskName, validateDone } = require("../validation/todos");
const validate = require("../middleware/validate");
const {
  getTodos,
  getTodoById,
  createTodo,
  updateTodo,
  deleteTodo,
} = require("../controllers/todos");

const router = express.Router();

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
