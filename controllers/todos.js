const db = require("../db");

const sortFieldMap = {
  completed: "done",
};

const getTodos = async (req, res, next) => {
  try {
    const { sort, order, search, page = 0, size = 10 } = req.query;

    const orderFilter = order === "desc" ? "DESC" : "ASC";

    const query = [
      "SELECT * FROM todo_list WHERE created_by = $1 AND is_deleted = false",
    ];
    const params = [req.user.id];

    if (search) {
      query.push(`AND title ILIKE $${params.length + 1}`);
      params.push(`%${search}%`);
    }

    const totalElements = await db.one(
      query
        .join(" ")
        .replace(
          "SELECT * FROM todo_list",
          "SELECT COUNT(*) AS count FROM todo_list",
        ),
      params,
    );
    const totalCount = parseInt(totalElements.count, 10);

    query.push(
      `ORDER BY ${sortFieldMap[sort] || sort || "created_at"} ${orderFilter}`,
    );

    const zeroBasedPage = Math.max(0, parseInt(page, 10) - 1);

    query.push(`LIMIT $${params.length + 1} OFFSET $${params.length + 2}`);
    params.push(size, zeroBasedPage * size);

    const todos = await db.any(query.join(" "), params);

    return res.json({
      data: todos,
      page: {
        size,
        totalElements: totalCount,
        totalPages: Math.ceil(totalCount / size),
        number: zeroBasedPage,
      },
    });
  } catch (error) {
    next(error);
  }
};

const getTodoById = async (req, res, next) => {
  const { id } = req.params;

  try {
    const todo = await db.oneOrNone(
      "SELECT * FROM todo_list WHERE id = $1 AND created_by = $2",
      [id, req.user.id],
    );

    if (todo) {
      res.json(todo);
    } else {
      res.status(404).send({ message: "Todo not found" });
    }
  } catch (error) {
    next(error);
  }
};

const createTodo = async (req, res, next) => {
  const { title, done, categories } = req.body;

  try {
    const todo = await db.one(
      `INSERT INTO todo_list(title, done, categories, created_by) 
        VALUES($1, $2, $3, $4) 
        RETURNING id, title, done, categories, created_by`,
      [title, done === true, categories, req.user.id],
    );

    res.status(201).json(todo);
  } catch (error) {
    next(error);
  }
};

const updateTodo = async (req, res, next) => {
  const { id } = req.params;
  const { title, done, categories } = req.body;

  try {
    const updatedTodo = await db.oneOrNone(
      `
      UPDATE todo_list
      SET title = COALESCE($1, title),
          done = COALESCE($2, done),
          categories = COALESCE($3, categories)
      WHERE id = $4 AND created_by = $5
      RETURNING id, title, done;
    `,
      [title, done, categories, id, req.user.id],
    );

    if (!updatedTodo) {
      return res.status(404).json({ message: "Todo not found" });
    }

    res.status(200).json({ message: "Todo updated successfully" });
  } catch (error) {
    next(error);
  }
};

const deleteTodo = async (req, res, next) => {
  const { id } = req.params;

  try {
    const result = await db.oneOrNone(
      "UPDATE todo_list SET is_deleted = true WHERE id = $1 AND created_by = $2 RETURNING id",
      [id, req.user.id],
    );

    console.log(">>>>>>", result);

    if (!result) {
      return res.status(404).send({ message: "Todo not found" });
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTodos,
  getTodoById,
  createTodo,
  updateTodo,
  deleteTodo,
};
