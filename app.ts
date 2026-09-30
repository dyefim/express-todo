import fs from "node:fs";
import path from "node:path";
import express from "express";
import swaggerUi from "swagger-ui-express";
import env from "./config/env";
import swaggerSpec from "./config/swagger";
import errorHandler from "./middleware/error";
import logger from "./middleware/logger";

const app = express();
const port = 3000;

import db from "./config/db";

app.use(logger);
app.use(express.json());

app.use("/static", express.static(path.join(__dirname, "files")));

if (env.nodeEnv !== "production") {
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
}

import authRoutes from "./routes/auth";
import categoriesRoutes from "./routes/categories";
import healthRoutes from "./routes/health";
import todosRoutes from "./routes/todos";

app.use("/health", healthRoutes);
app.use("/todos", todosRoutes);
app.use("/categories", categoriesRoutes);
app.use("/auth", authRoutes);

app.use(errorHandler);

if (require.main === module) {
  db.one("SELECT 1")
    .then(() => console.log("Database connected"))
    .catch((err: unknown) => console.error("Database connection failed:", err));

  // Start the server only if this file is run directly
  app.listen(port, () => {
    fs.mkdirSync("logs", { recursive: true });
    if (!fs.existsSync("logs/operations.log")) {
      fs.writeFileSync("logs/operations.log", "");
    }

    console.log(`App listening on port ${port}`);
  });
}

export = app;
