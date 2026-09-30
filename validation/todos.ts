import type { Request } from "express";
import { body } from "express-validator";
import { parseStringParam } from "../utils/parse";

export const validateDone = body("done")
  .optional()
  .isBoolean()
  .withMessage("Done must be a boolean");

export const validateTaskName = ({ required }: { required?: boolean } = {}) => {
  const chain = body("title").isString().escape();

  return required
    ? chain.notEmpty().withMessage("Task name is required")
    : chain.optional().withMessage("Task name must be a string");
};

export const validateCategories = body("categories")
  .optional()
  .isArray()
  .withMessage("Categories must be an array of IDs")
  .bail()
  .custom((categories) => categories.every((c: unknown) => Number.isInteger(c)))
  .withMessage("Each category must be an integer ID");

const ALLOWED_QUERY_PARAMS = new Set([
  "sort",
  "order",
  "search",
  "page",
  "size",
]);
const SORT_FIELDS = new Set(["title", "created_at", "completed"]);
const ORDER_VALUES = new Set(["asc", "desc"]);

export const validateQueryParams = (req: Request) => {
  const { query } = req;

  const hasUnknownQueryParam = Object.keys(query).some(
    (key) => !ALLOWED_QUERY_PARAMS.has(key),
  );

  if (hasUnknownQueryParam) {
    return {
      error: `Invalid query parameter. Allowed query parameters are: ${Array.from(ALLOWED_QUERY_PARAMS).join(", ")}`,
    };
  }

  const hasMultipleInstancesOfQueryParam = Object.keys(query).some((key) =>
    Array.isArray(query[key]),
  );

  if (hasMultipleInstancesOfQueryParam) {
    return {
      error: "Multiple instances of the same query parameter are not allowed",
    };
  }

  const sort = parseStringParam(query.sort, undefined);

  const hasInvalidSortField = sort && !SORT_FIELDS.has(sort);

  if (hasInvalidSortField) {
    return {
      error: `Invalid sort parameter. Allowed sort fields are: ${Array.from(SORT_FIELDS).join(", ")}`,
    };
  }

  const order = parseStringParam(query.order, undefined);

  const hasInvalidOrderValue = order && !ORDER_VALUES.has(order);

  if (hasInvalidOrderValue) {
    return {
      error: `Invalid order parameter. Allowed order values are: ${Array.from(ORDER_VALUES).join(", ")}`,
    };
  }
};
