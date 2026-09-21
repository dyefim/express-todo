const fs = require("fs").promises;
const path = require("path");

const logFilePath = path.join(__dirname, "..", "logs", "operations.log");
const logDirectoryReady = fs.mkdir(path.dirname(logFilePath), {
  recursive: true,
});

const logger = (req, res, next) => {
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
