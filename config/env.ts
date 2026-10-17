// Optional: env vars may already be supplied by --env-file, CI, or the platform
try {
  process.loadEnvFile();
} catch (err) {
  if ((err as { code?: string }).code !== "ENOENT") throw err;
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

interface EnvPairs {
  nodeEnv: string;
  dbHost: string;
  dbPort: number;
  dbUser: string;
  dbPassword: string;
  dbName: string;
  databaseUrl: string;
  jwtSecretKey: string;
  tokenHeaderKey: string;
}

const dbHost = process.env.DB_HOST || "localhost";
const dbPort = Number(process.env.DB_PORT) || 5432;
const dbUser = process.env.POSTGRES_USER;
const dbPassword = process.env.POSTGRES_PASSWORD;
const dbName = process.env.POSTGRES_DB;

export = {
  nodeEnv: process.env.NODE_ENV || "development",
  dbHost,
  dbPort,
  dbUser,
  dbPassword,
  dbName,
  databaseUrl: `postgres://${dbUser}${dbPassword ? `:${dbPassword}` : ""}@${dbHost}:${dbPort}/${dbName}`,
  jwtSecretKey: process.env.JWT_SECRET_KEY,
  tokenHeaderKey: process.env.TOKEN_HEADER_KEY,
} as EnvPairs;
