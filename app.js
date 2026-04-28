const express = require("express");
const path = require("path");
const fs = require("fs");

const logger = require("./middleware/logger");

const app = express();
const port = 3000;

app.use(logger);
app.use(express.json());
app.use("/static", express.static(path.join(__dirname, "files")));
app.use("/todos", require("./routes/todos"));

app.listen(port, () => {
  if (!fs.existsSync("data/todos.json")) {
    fs.writeFileSync("data/todos.json", "[]");
  }

  if (!fs.existsSync("logs/operations.log")) {
    fs.writeFileSync("logs/operations.log", "");
  }

  console.log(`Example app listening on port ${port}`);
});
