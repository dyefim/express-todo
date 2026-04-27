const express = require("express");
const path = require("path");
const fs = require("fs");
const { randomUUID } = require("node:crypto");

const logger = require("./middleware/logger");

const app = express();
const port = 3000;

app.use(logger);

app.use("/static", express.static(path.join(__dirname, "files")));

app.use(express.json());

const loadTodosFromFile = () => {
  try {
    return fs.readFileSync("todos.json", "utf-8");
  } catch (error) {
    console.error("Error loading todos from file", error);

    return "[]";
  }
};

const parseTodos = (todos) => {
  try {
    return JSON.parse(todos);
  } catch (error) {
    console.error("Error parsing todos", error);
    return null;
  }
};

const loadParsedTodosOr500 = (res) => {
  const todos = parseTodos(loadTodosFromFile());

  if (!Array.isArray(todos)) {
    res.status(500).send({ message: "Internal Server Error" });
    return null;
  }

  return todos;
};

app.get("/todos", (req, res) => {
  const todos = loadParsedTodosOr500(res);

  if (!todos) {
    return;
  }

  res.json(todos);
});

app.get("/todos/:id", (req, res) => {
  const todos = loadParsedTodosOr500(res);

  if (!todos) {
    return;
  }

  const { id } = req.params;

  const todo = todos.find((t) => t.id === id);

  if (todo) {
    res.json(todo);
  } else {
    res.status(404).send({ message: "Todo not found" });
  }
});

app.post("/todos", (req, res) => {
  const todos = loadParsedTodosOr500(res);

  if (!todos) {
    return;
  }

  const { taskName, done } = req.body;

  if (!taskName) {
    return res.status(400).send({ message: "Task name is required" });
  }

  const isTaskExist = todos.some((t) => t.taskName === taskName);

  if (isTaskExist) {
    return res.status(400).send({ message: "Task already exists" });
  }

  const todo = {
    id: randomUUID(),
    taskName,
    done: done === true,
  };

  todos.push(todo);

  fs.writeFileSync("todos.json", JSON.stringify(todos, null, 2));

  res.status(201).json(todo);
});

app.patch("/todos/:id", (req, res) => {
  const todos = loadParsedTodosOr500(res);

  if (!todos) {
    return;
  }

  const { id } = req.params;
  const { taskName, done } = req.body;

  const todoIndex = todos.findIndex((t) => t.id === id);

  if (todoIndex === -1) {
    return res.status(404).send({ message: "Todo not found" });
  }

  if (taskName) {
    todos[todoIndex].taskName = taskName;
  }

  if (typeof done === "boolean") {
    todos[todoIndex].done = done === true;
  }

  fs.writeFileSync("todos.json", JSON.stringify(todos, null, 2));

  res.json(todos[todoIndex]);
});

app.delete("/todos/:id", (req, res) => {
  const todos = loadParsedTodosOr500(res);

  if (!todos) {
    return;
  }

  const { id } = req.params;

  const newTodos = todos.filter((t) => t.id !== id);

  if (todos.length === newTodos.length) {
    return res.status(404).send({ message: "Todo not found" });
  }

  fs.writeFileSync("todos.json", JSON.stringify(newTodos, null, 2));

  res.status(204).send();
});

app.listen(port, () => {
  if (!fs.existsSync("todos.json")) {
    fs.writeFileSync("todos.json", "[]");
  }

  if (!fs.existsSync("operations.log")) {
    fs.writeFileSync("operations.log", "");
  }

  console.log(`Example app listening on port ${port}`);
});
