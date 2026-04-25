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

  res.send(todo);
});

app.get("/", (req, res) => {
  const todos = fs.readFileSync("todos.json", "utf-8");

  res.send(todos);
});

app.post("/", (req, res) => {
  const todos = JSON.parse(fs.readFileSync("todos.json", "utf-8"));

  const { taskName, done } = req.body;

  todos.push({
    id: randomUUID(),
    taskName,
    done: done === "true",
  });

  fs.writeFileSync("todos.json", JSON.stringify(todos, null, 2));

  res.status(201).send("Todo added successfully");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
