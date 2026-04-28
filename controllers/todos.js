const fs = require("fs");
const { randomUUID } = require("node:crypto");
const { loadParsedTodosOr500 } = require("../utils/todos");

const getTodos = (req, res) => {
  const todos = loadParsedTodosOr500(res);

  if (!todos) {
    return;
  }

  res.json(todos);
};

const getTodoById = (req, res) => {
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
};

const createTodo = (req, res) => {
  const todos = loadParsedTodosOr500(res);

  if (!todos) {
    return;
  }

  const { taskName, done } = req.body;

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

  fs.writeFileSync("data/todos.json", JSON.stringify(todos, null, 2));

  res.status(201).json(todo);
};

const updateTodo = (req, res) => {
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

  fs.writeFileSync("data/todos.json", JSON.stringify(todos, null, 2));

  res.json(todos[todoIndex]);
};

const deleteTodo = (req, res) => {
  const todos = loadParsedTodosOr500(res);

  if (!todos) {
    return;
  }

  const { id } = req.params;

  const newTodos = todos.filter((t) => t.id !== id);

  if (todos.length === newTodos.length) {
    return res.status(404).send({ message: "Todo not found" });
  }

  fs.writeFileSync("data/todos.json", JSON.stringify(newTodos, null, 2));

  res.status(204).send();
};

module.exports = {
  getTodos,
  getTodoById,
  createTodo,
  updateTodo,
  deleteTodo,
};
