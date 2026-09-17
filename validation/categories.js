const { body } = require("express-validator");

const validateCategoryName = () => {
  return body("name").notEmpty().isString().escape();
};

module.exports = {
  validateCategoryName,
};
