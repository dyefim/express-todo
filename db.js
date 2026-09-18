const pgp = require("pg-promise")(/* options */);

const env = require("./config/env");

const db = pgp(
  `postgres://${env.dbUser}${env.dbPassword ? `:${env.dbPassword}` : ""}@${env.dbHost}:${env.dbPort}/${env.dbName}`,
);

module.exports = db;
