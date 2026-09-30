import type { NextFunction, Request, Response } from "express";
import { validationResult } from "express-validator";
import { validateQueryParams } from "../validation/todos";

const validate = (req: Request, res: Response, next: NextFunction) => {
  const result = validationResult(req);

  if (!result.isEmpty()) {
    return res
      .status(400)
      .send({ message: "Invalid input", errors: result.array() });
  }

  const queryValidationResult = validateQueryParams(req);

  if (queryValidationResult?.error) {
    return res.status(400).send({ message: queryValidationResult.error });
  }

  next();
};

export default validate;
