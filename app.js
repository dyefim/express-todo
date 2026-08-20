const express = require("express");
const path = require("path");
const fs = require("fs");

const logger = require("./middleware/logger");
const { checkIncompleteTodos } = require("./controllers/todos");

const app = express();
const port = 3000;

const db = require("./db");

db.one("SELECT 1")
  .then(() => console.log("Database connected"))
  .catch((err) => console.error("Database connection failed:", err));

checkIncompleteTodos();

app.use(logger);
app.use(express.json());
app.use("/static", express.static(path.join(__dirname, "files")));
app.use("/todos", require("./routes/todos"));

app.listen(port, () => {
  fs.mkdirSync("data", { recursive: true });
  if (!fs.existsSync("data/todos.json")) {
    fs.writeFileSync("data/todos.json", "[]");
  }

  fs.mkdirSync("logs", { recursive: true });
  if (!fs.existsSync("logs/operations.log")) {
    fs.writeFileSync("logs/operations.log", "");
  }

  console.log(`Example app listening on port ${port}`);
});
