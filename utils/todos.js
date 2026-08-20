const db = require("../db");

const readTodosFromDatabase = async (res) => {
  try {
    const todos = await db.any("SELECT * FROM todo_list");

    return todos;
  } catch (error) {
    console.error("Error reading todos from database", error);

    return res.status(500).send({ message: "Internal Server Error" });
  }
};

module.exports = {
  readTodosFromDatabase,
};
