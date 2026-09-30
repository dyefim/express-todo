import { body } from "express-validator";

export const validateCategoryName = () => {
  return body("name").notEmpty().isString().escape();
};
