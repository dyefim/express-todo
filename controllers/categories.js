const db = require("../config/db");

const getCategories = async (req, res, next) => {
  try {
    const categories = await db.any(
      "SELECT * FROM categories WHERE created_by = $1 ORDER BY created_at",
      [req.user.id],
    );

    return res.json({
      data: categories,
    });
  } catch (error) {
    next(error);
  }
};

const getCategoryById = async (req, res, next) => {
  const { id } = req.params;

  try {
    const category = await db.oneOrNone(
      "SELECT * FROM categories WHERE id = $1 AND created_by = $2",
      [id, req.user.id],
    );

    if (category) {
      res.json(category);
    } else {
      res.status(404).send({ message: "Category not found" });
    }
  } catch (error) {
    next(error);
  }
};

const createCategory = async (req, res, next) => {
  const { name } = req.body;

  try {
    const category = await db.one(
      "INSERT INTO categories(name, created_by) VALUES($1, $2) RETURNING id, name, created_by",
      [name, req.user.id],
    );

    res.status(201).json(category);
  } catch (error) {
    next(error);
  }
};

const updateCategory = async (req, res, next) => {
  const { id } = req.params;
  const { name } = req.body;

  try {
    const updatedCategory = await db.oneOrNone(
      `
      UPDATE categories
      SET name = COALESCE($1, name)
      WHERE id = $2 AND created_by = $3;
    `,
      [name, id, req.user.id],
    );

    if (!updatedCategory) {
      return res.status(404).json({ message: "Category not found" });
    }

    res.status(200).json({ message: "Category updated successfully" });
  } catch (error) {
    next(error);
  }
};

const deleteCategory = async (req, res, next) => {
  const { id } = req.params;

  try {
    const result = await db.result(
      "DELETE FROM categories WHERE id = $1 AND created_by = $2",
      [id, req.user.id],
    );

    if (result.rowCount === 0) {
      return res.status(404).send({ message: "Category not found" });
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCategories,
  getCategoryById,
  createCategory,
  updateCategory,
  deleteCategory,
};
