const fs = require("node:fs").promises;
const path = require("node:path");

const logFilePath = path.join(__dirname, "..", "logs", "operations.log");
const logDirectoryReady = fs.mkdir(path.dirname(logFilePath), {
  recursive: true,
});

const logger = (req, _res, next) => {
  void logDirectoryReady
    .then(() =>
      fs.appendFile(
        logFilePath,
        `${req.method.padEnd(6)} ${req.url} ${new Date().toISOString()}\n`,
      ),
    )
    .catch((err) => {
      console.error("Error writing to log file", err);
    });

  next();
};

module.exports = logger;
