const fs = require("fs");

const loadTodosFromFile = () => {
  try {
    return fs.readFileSync("data/todos.json", "utf-8");
  } catch (error) {
    console.error("Error loading todos from file", error);

    return "[]";
  }
};

const parseTodos = (todos) => {
  try {
    return JSON.parse(todos);
  } catch (error) {
    console.error("Error parsing todos", error);
    return null;
  }
};

const loadParsedTodosOr500 = (res) => {
  const todos = parseTodos(loadTodosFromFile());

  if (!Array.isArray(todos)) {
    res.status(500).send({ message: "Internal Server Error" });
    return null;
  }

  return todos;
};

module.exports = {
  loadParsedTodosOr500,
};
