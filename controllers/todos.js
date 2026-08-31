const db = require("../db");

const getTodos = async (req, res, next) => {
  try {
    const todos = await db.any(
      "SELECT * FROM todo_list WHERE created_by = $1",
      [req.user.id],
    );

    return res.json(todos);
  } catch (error) {
    next(error);
  }
};

const getTodoById = async (req, res, next) => {
  const { id } = req.params;

  try {
    const todo = await db.oneOrNone(
      "SELECT * FROM todo_list WHERE id = $1 AND created_by = $2",
      [id, req.user.id],
    );

    if (todo) {
      res.json(todo);
    } else {
      res.status(404).send({ message: "Todo not found" });
    }
  } catch (error) {
    next(error);
  }
};

const createTodo = async (req, res, next) => {
  const { title, done } = req.body;

  try {
    const todo = await db.one(
      "INSERT INTO todo_list(title, done, created_by) VALUES($1, $2, $3) RETURNING id, title, done, created_by",
      [title, done === true, req.user.id],
    );

    res.status(201).json(todo);
  } catch (error) {
    next(error);
  }
};

const updateTodo = async (req, res, next) => {
  const { id } = req.params;
  const { title, done } = req.body;

  try {
    const updatedTodo = await db.oneOrNone(
      `
      UPDATE todo_list
      SET title = COALESCE($1, title),
          done = COALESCE($2, done)
      WHERE id = $3 AND created_by = $4
      RETURNING id, title, done;
    `,
      [title, done, id, req.user.id],
    );

    if (!updatedTodo) {
      return res.status(404).json({ message: "Todo not found" });
    }

    res.status(200).json({ message: "Todo updated successfully" });
  } catch (error) {
    next(error);
  }
};

const deleteTodo = async (req, res, next) => {
  const { id } = req.params;

  try {
    const result = await db.result(
      "DELETE FROM todo_list WHERE id = $1 AND created_by = $2",
      [id, req.user.id],
    );

    if (result.rowCount === 0) {
      return res.status(404).send({ message: "Todo not found" });
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTodos,
  getTodoById,
  createTodo,
  updateTodo,
  deleteTodo,
};
