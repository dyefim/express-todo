import fs from "node:fs/promises";
import path from "node:path";
import type { NextFunction, Request, Response } from "express";

const logFilePath = path.join(__dirname, "..", "logs", "operations.log");
const logDirectoryReady = fs.mkdir(path.dirname(logFilePath), {
  recursive: true,
});

const logger = (req: Request, _res: Response, next: NextFunction) => {
  void logDirectoryReady
    .then(() =>
      fs.appendFile(
        logFilePath,
        `${req.method.padEnd(6)} ${req.url} ${new Date().toISOString()}\n`,
      ),
    )
    .catch((err: Error) => {
      console.error("Error writing to log file", err);
    });

  next();
};

export = logger;
