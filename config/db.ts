import pgPromise from "pg-promise";
import env from "./env";

const pgp = pgPromise();

const db = pgp(
  `postgres://${env.dbUser}${env.dbPassword ? `:${env.dbPassword}` : ""}@${env.dbHost}:${env.dbPort}/${env.dbName}`,
);

export = db;
