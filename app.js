const express = require("express");
const path = require("path");
const fs = require("fs");
const { randomUUID } = require("node:crypto");

const app = express();
const port = 3000;

app.use("/static", express.static(path.join(__dirname, "files")));

app.use(express.json());

app.get("/:id", (req, res) => {
  const todos = fs.readFileSync("todos.json", "utf-8");

  const { id } = req.params;

  const todo = JSON.parse(todos).find((t) => t.id === id);

  if (todo) {
    res.send(todo);
  } else {
    res.status(404).send("Todo not found");
  }
});

app.get("/", (req, res) => {
  const todos = fs.readFileSync("todos.json", "utf-8");

  res.send(todos);
});

app.post("/", (req, res) => {
  const todos = JSON.parse(fs.readFileSync("todos.json", "utf-8"));

  const { taskName, done } = req.body;

  const isTaskExist = todos.some((t) => t.taskName === taskName);

  if (isTaskExist) {
    return res.status(400).send("Task already exists");
  }

  todos.push({
    id: randomUUID(),
    taskName,
    done: done === true,
  });

  fs.writeFileSync("todos.json", JSON.stringify(todos, null, 2));

  res.status(201).send("Todo added successfully");
});

app.patch("/:id", (req, res) => {
  const todos = JSON.parse(fs.readFileSync("todos.json", "utf-8"));

  const { id } = req.params;
  const { taskName, done } = req.body;

  const todoIndex = todos.findIndex((t) => t.id === id);

  if (todoIndex === -1) {
    return res.status(404).send("Todo not found");
  }

  if (taskName) {
    todos[todoIndex].taskName = taskName;
  }

  console.log(done);

  if (done) {
    todos[todoIndex].done = done === true;
  }

  fs.writeFileSync("todos.json", JSON.stringify(todos, null, 2));

  res.send("Todo updated successfully");
});

app.delete("/:id", (req, res) => {
  const todos = JSON.parse(fs.readFileSync("todos.json", "utf-8"));

  const { id } = req.params;

  const newTodos = todos.filter((t) => t.id !== id);

  if (todos.length === newTodos.length) {
    return res.status(404).send("Todo not found");
  }

  fs.writeFileSync("todos.json", JSON.stringify(newTodos, null, 2));

  res.send("Todo deleted successfully");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
