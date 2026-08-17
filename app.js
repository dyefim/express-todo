const express = require("express");
const path = require("path");
const fs = require("fs");

const logger = require("./middleware/logger");

const app = express();
const port = 3000;

const pgp = require("pg-promise")(/* options */);

process.loadEnvFile();

const HOST = "localhost";
const PORT = process.env.PORT || 5432;
const username = process.env.POSTGRES_USER;
const password = process.env.POSTGRES_PASSWORD;
const database = process.env.POSTGRES_DB;

const db = pgp(
  `postgres://${username}${password ? `:${password}` : ""}@${HOST}:${PORT}/${database}`,
);

db.one("SELECT 1")
  .then(() => console.log("Database connected"))
  .catch((err) => console.error("Database connection failed:", err));

db.any("SELECT * FROM todo_list WHERE done = $1", [true])
  .then(function (data) {
    console.log(data);
  })
  .catch(function (error) {
    console.log("ERROR:", error);
  });

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
