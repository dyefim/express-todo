const db = require("../config/db");

const sortFieldMap = {
  completed: "done",
};

const todosWithCategoriesQuery = `
  SELECT t.*, COALESCE(array_agg(c.name) FILTER (WHERE c.id IS NOT NULL), '{}') AS categories
`;

const todoCategoriesJoin = `
  FROM tasks t 
  LEFT JOIN task_categories tc ON t.id = tc.task_id 
  LEFT JOIN categories c ON tc.category_id = c.id  
`;

const getTodos = async (req, res, next) => {
  try {
    const { sort, order, search, page = 0, size = 10 } = req.query;

    const orderFilter = order === "desc" ? "DESC" : "ASC";

    const query = [
      `${todosWithCategoriesQuery}
        ${todoCategoriesJoin}
        WHERE t.created_by = $1 AND t.is_deleted = false`,
    ];
    const params = [req.user.id];

    const totalQuery = [
      `SELECT COUNT(*) AS count FROM tasks 
        WHERE created_by = $1 AND is_deleted = false`,
    ];

    if (search) {
      const searchQueryFragment = `AND title ILIKE $${params.length + 1}`;
      query.push(searchQueryFragment);
      totalQuery.push(searchQueryFragment);
      params.push(`%${search}%`);
    }

    const totalElements = await db.one(totalQuery.join(" "), params);

    const totalCount = parseInt(totalElements.count, 10);

    query.push(
      `GROUP BY t.id ORDER BY ${sortFieldMap[sort] || sort || "created_at"} ${orderFilter}`,
    );

    let zeroBasedPage = Math.max(0, parseInt(page, 10) - 1);

    if (Number.isNaN(zeroBasedPage)) {
      zeroBasedPage = 0;
    }

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
      `${todosWithCategoriesQuery}
        ${todoCategoriesJoin}
        WHERE t.id = $1 AND t.created_by = $2 AND t.is_deleted = false
        GROUP BY t.id`,
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
    const todo = await db.tx(async (t) => {
      const todoResult = await t.one(
        `INSERT INTO tasks(title, done, created_by) 
            VALUES($1, $2, $3) 
            RETURNING id, title, done, created_by`,
        [title, done === true, req.user.id],
      );

      await t.none(
        `INSERT INTO task_categories(task_id, category_id)
            SELECT $1, id FROM categories WHERE id = ANY($2::int[])`,
        [todoResult.id, categories || []],
      );

      return todoResult;
    });

    const todoWithCategories = await db.oneOrNone(
      `${todosWithCategoriesQuery}
        ${todoCategoriesJoin}
        WHERE t.id = $1 AND t.created_by = $2 
        GROUP BY t.id`,
      [todo.id, req.user.id],
    );

    res.status(201).json(todoWithCategories);
  } catch (error) {
    next(error);
  }
};

const updateTodo = async (req, res, next) => {
  const { id } = req.params;
  const { title, done, categories } = req.body;

  try {
    const updatedTodo = await db.oneOrNone(
      `UPDATE tasks
        SET title = COALESCE($1, title),
            done = COALESCE($2, done)
        WHERE id = $3 AND created_by = $4
        RETURNING id, title, done;`,
      [title, done, id, req.user.id],
    );

    if (!updatedTodo) {
      return res.status(404).json({ message: "Todo not found" });
    }

    if (Array.isArray(categories)) {
      await db.tx(async (t) => {
        // remove existing categories
        await t.none(`DELETE FROM task_categories WHERE task_id = $1`, [id]);

        // add new categories
        await t.none(
          `INSERT INTO task_categories(task_id, category_id)
          SELECT $1, id FROM categories WHERE id = ANY($2::int[])`,
          [id, categories || []],
        );
      });
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
      "UPDATE tasks SET is_deleted = true WHERE id = $1 AND created_by = $2 RETURNING id",
      [id, req.user.id],
    );

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
