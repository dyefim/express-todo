const express = require("express");
const rateLimit = require("express-rate-limit");

const { validateCategoryName } = require("../validation/categories");
const validate = require("../middleware/validate");
const { verifyToken } = require("../controllers/auth");
const {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
} = require("../controllers/categories");

const router = express.Router();

const limiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  limit: 100,
  skip: (req, res) => process.env.NODE_ENV === "test",
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

module.exports = router;
