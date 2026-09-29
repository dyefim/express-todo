import type { NextFunction, Request, Response } from "express";

const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
) => {
  console.error(err);

  if ("code" in err && err.code === "23505") {
    return res.status(409).json({ message: "Duplicate entry" });
  }

  return res.status(500).json({ message: "Internal Server Error" });
};

export = errorHandler;
