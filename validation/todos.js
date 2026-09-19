const { body } = require("express-validator");

const validateDone = body("done")
  .optional()
  .isBoolean()
  .withMessage("Done must be a boolean");

const validateTaskName = ({ required } = {}) => {
  const chain = body("title").isString().escape();

  return required
    ? chain.notEmpty().withMessage("Task name is required")
    : chain.optional().withMessage("Task name must be a string");
};

const validateCategories = body("categories")
  .optional()
  .isArray()
  .withMessage("Categories must be an array of IDs")
  .bail()
  .custom((categories) => categories.every((c) => Number.isInteger(c)))
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

const validateQueryParams = (req) => {
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

  const hasInvalidSortField = query.sort && !SORT_FIELDS.has(query.sort);

  if (hasInvalidSortField) {
    return {
      error: `Invalid sort parameter. Allowed sort fields are: ${Array.from(SORT_FIELDS).join(", ")}`,
    };
  }

  const hasInvalidOrderValue = query.order && !ORDER_VALUES.has(query.order);

  if (hasInvalidOrderValue) {
    return {
      error: `Invalid order parameter. Allowed order values are: ${Array.from(ORDER_VALUES).join(", ")}`,
    };
  }
};

module.exports = {
  validateDone,
  validateTaskName,
  validateCategories,
  validateQueryParams,
};
