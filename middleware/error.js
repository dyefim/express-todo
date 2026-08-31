const errorHandler = (err, req, res, next) => {
  console.error(err);

  if (err.code === "23505") {
    return res.status(409).json({ message: "Duplicate entry" });
  }

  return res.status(500).json({ message: "Internal Server Error" });
};

module.exports = errorHandler;
