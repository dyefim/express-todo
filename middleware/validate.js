const { validationResult } = require("express-validator");
const { validateQueryParams } = require("../validation/todos");

const validate = (req, res, next) => {
  const result = validationResult(req);

  if (!result.isEmpty()) {
    return res
      .status(400)
      .send({ message: "Invalid input", errors: result.array() });
  }

  const queryValidationResult = validateQueryParams(req);

  if (queryValidationResult && queryValidationResult.error) {
    return res.status(400).send({ message: queryValidationResult.error });
  }

  next();
};

module.exports = validate;
