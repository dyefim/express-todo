const db = require("../db");

const getTodos = async (req, res) => {
  try {
    const todos = await db.any("SELECT * FROM todo_list");

    return res.json(todos);
  } catch (error) {
    console.error("Error reading todos from database", error);

    return res.status(500).send({ message: "Internal Server Error" });
  }
};

const checkIncompleteTodos = async () => {
  try {
    const data = await db.any("SELECT * FROM todo_list WHERE done = $1", [
      false,
    ]);

    console.log(`Found ${data.length} incomplete todos.`);

    if (data.length > 0) {
      console.log(data);
    }
  } catch (error) {
    console.log("ERROR:", error);
  }
};

const getTodoById = async (req, res) => {
  const { id } = req.params;

  const todo = await db.oneOrNone("SELECT * FROM todo_list WHERE id = $1", [
    id,
  ]);

  if (todo) {
    res.json(todo);
  } else {
    res.status(404).send({ message: "Todo not found" });
  }
};

const createTodo = async (req, res) => {
  const { title, done } = req.body;

  try {
    const todo = await db.one(
      "INSERT INTO todo_list(title, done) VALUES($1, $2) RETURNING id, title, done",
      [title, done === true],
    );

    res.status(201).json(todo);
  } catch (error) {
    if (error.code === "23505") {
      return res.status(400).json({ message: "Task already exists" });
    }
    res.status(500).json({ message: "Internal Server Error" });
  }
};

const updateTodo = async (req, res) => {
  const { id } = req.params;
  const { title, done } = req.body;

  try {
    const todo = await db.oneOrNone("SELECT * FROM todo_list WHERE id = $1", [
      id,
    ]);

    if (!todo) {
      return res.status(404).send({ message: "Todo not found" });
    }

    if (title) {
      await db.none("UPDATE todo_list SET title = $1 WHERE id = $2", [
        title,
        id,
      ]);
    }

    if (typeof done === "boolean") {
      await db.none("UPDATE todo_list SET done = $1 WHERE id = $2", [done, id]);
    }

    res.status(200).json({ message: "Todo updated successfully" });
  } catch (error) {
    console.log("ERROR:", error);
    res.status(500).send({ message: "Internal Server Error" });
  }
};

const deleteTodo = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await db.result("DELETE FROM todo_list WHERE id = $1", [id]);

    if (result.rowCount === 0) {
      return res.status(404).send({ message: "Todo not found" });
    }

    res.status(204).send();
  } catch (error) {
    console.log("ERROR:", error);
    res.status(500).send({ message: "Internal Server Error" });
  }
};

module.exports = {
  getTodos,
  checkIncompleteTodos,
  getTodoById,
  createTodo,
  updateTodo,
  deleteTodo,
};
