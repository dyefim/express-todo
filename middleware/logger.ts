import type { NextFunction, Request, Response } from "express";

const logger = (req: Request, _res: Response, next: NextFunction) => {
  console.log(`${req.method.padEnd(6)} ${req.url} ${new Date().toISOString()}`);
  next();
};

export default logger;
