const fs = require("fs").promises;

const logger = (req, res, next) => {
  fs.appendFile(
    "operations.log",
    `${req.method.padEnd(6)} ${req.url} ${new Date().toISOString()}\n`,
    (err) => {
      if (err) {
        console.error("Error writing to log file", err);
      }
    },
  );

  next();
};

module.exports = logger;
