const pgp = require("pg-promise")(/* options */);

const env = require("./env");

const db = pgp(
  `postgres://${env.dbUser}${env.dbPassword ? `:${env.dbPassword}` : ""}@${env.dbHost}:${env.dbPort}/${env.dbName}`,
);

module.exports = db;
