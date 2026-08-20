const pgp = require("pg-promise")(/* options */);

process.loadEnvFile();

const HOST = "localhost";
const DB_PORT = process.env.DB_PORT || 5432;
const username = process.env.POSTGRES_USER;
const password = process.env.POSTGRES_PASSWORD;
const database = process.env.POSTGRES_DB;

const db = pgp(
  `postgres://${username}${password ? `:${password}` : ""}@${HOST}:${DB_PORT}/${database}`,
);

module.exports = db;
