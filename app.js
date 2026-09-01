const express = require("express");
const path = require("path");
const fs = require("fs");
const rateLimit = require("express-rate-limit");

const logger = require("./middleware/logger");
const errorHandler = require("./middleware/error");

const app = express();
const port = 3000;

const db = require("./db");

db.one("SELECT 1")
  .then(() => console.log("Database connected"))
  .catch((err) => console.error("Database connection failed:", err));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 100,
});

app.use(logger);
app.use(express.json());
app.use(limiter);

app.use("/static", express.static(path.join(__dirname, "files")));
app.use("/todos", require("./routes/todos"));
app.use("/auth", require("./routes/auth"));

app.use(errorHandler);

app.listen(port, () => {
  fs.mkdirSync("data", { recursive: true });
  if (!fs.existsSync("data/todos.json")) {
    fs.writeFileSync("data/todos.json", "[]");
  }

  fs.mkdirSync("logs", { recursive: true });
  if (!fs.existsSync("logs/operations.log")) {
    fs.writeFileSync("logs/operations.log", "");
  }

  console.log(`App listening on port ${port}`);
});
