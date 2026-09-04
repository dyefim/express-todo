const express = require("express");
const path = require("path");
const fs = require("fs");
const rateLimit = require("express-rate-limit");

const logger = require("./middleware/logger");
const errorHandler = require("./middleware/error");

const app = express();
const port = 3000;

const db = require("./db");

app.use(logger);
app.use(express.json());

app.use("/static", express.static(path.join(__dirname, "files")));
app.use("/todos", require("./routes/todos"));
app.use("/auth", require("./routes/auth"));

app.use(errorHandler);

if (require.main === module) {
  db.one("SELECT 1")
    .then(() => console.log("Database connected"))
    .catch((err) => console.error("Database connection failed:", err));

  // Start the server only if this file is run directly
  app.listen(port, () => {
    fs.mkdirSync("logs", { recursive: true });
    if (!fs.existsSync("logs/operations.log")) {
      fs.writeFileSync("logs/operations.log", "");
    }

    console.log(`App listening on port ${port}`);
  });
}

module.exports = app;
