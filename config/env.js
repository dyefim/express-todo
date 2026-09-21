"use strict";

// Optional: env vars may already be supplied by --env-file, CI, or the platform
try {
  process.loadEnvFile();
} catch (err) {
  if (err.code !== "ENOENT") throw err;
}

const required = [
  "POSTGRES_USER",
  "POSTGRES_PASSWORD",
  "POSTGRES_DB",
  "JWT_SECRET_KEY",
  "TOKEN_HEADER_KEY",
];

const missing = required.filter((key) => !process.env[key]);
// Fail fast at startup instead of hitting undefined values deep in the app
if (missing.length > 0) {
  throw new Error(
    `Missing required environment variables: ${missing.join(", ")}`,
  );
}

module.exports = {
  nodeEnv: process.env.NODE_ENV || "development",
  dbHost: "localhost",
  dbPort: Number(process.env.DB_PORT) || 5432,
  dbUser: process.env.POSTGRES_USER,
  dbPassword: process.env.POSTGRES_PASSWORD,
  dbName: process.env.POSTGRES_DB,
  jwtSecretKey: process.env.JWT_SECRET_KEY,
  tokenHeaderKey: process.env.TOKEN_HEADER_KEY,
};
