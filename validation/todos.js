const { body } = require("express-validator");

const validateDone = body("done")
  .optional()
  .isBoolean()
  .withMessage("Done must be a boolean");

const validateTaskName = ({ required } = {}) => {
  const chain = body("taskName").isString().escape();

  return required
    ? chain.notEmpty().withMessage("Task name is required")
    : chain.optional().withMessage("Task name must be a string");
};

module.exports = {
  validateDone,
  validateTaskName,
};
