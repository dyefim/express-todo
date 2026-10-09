import pgPromise from "pg-promise";
import env from "./env";

const pgp = pgPromise();

const db = pgp(env.databaseUrl);

export = db;
