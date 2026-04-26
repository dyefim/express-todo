const fs = require("fs");

const logger = (req, res, next) => {
  // check if the log file exists, if not create it
  if (!fs.existsSync("operations.log")) {
    fs.writeFileSync("operations.log", "");
  }

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
