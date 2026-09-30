import type { RequestHandler } from "express";
import db from "../config/db";

const sortFieldMap: Record<string, string> = {
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

// TODO: consider using a more robust validation and parsing library
const parseIntParam = (value: unknown, fallback: number) => {
  const parsed = typeof value === "string" ? parseInt(value, 10) : NaN;
  return Number.isNaN(parsed) ? fallback : parsed;
};

const parseStringParam = (value: unknown, fallback: string | undefined) => {
  return typeof value === "string" ? value : fallback;
};

export const getTodos: RequestHandler = async (req, res, next) => {
  try {
    const { order } = req.query;

    const page = parseIntParam(req.query.page, 0);
    const size = parseIntParam(req.query.size, 10);
    const sort = parseStringParam(req.query.sort, undefined);
    const search = parseStringParam(req.query.search, undefined);

    const orderFilter = order === "desc" ? "DESC" : "ASC";

    const query = [
      `${todosWithCategoriesQuery}
        ${todoCategoriesJoin}
        WHERE t.created_by = $1 AND t.is_deleted = false`,
    ];
    const params: (string | number | undefined)[] = [req.user?.id];

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

    const sortField = (sort && sortFieldMap[sort]) || sort || "created_at";

    query.push(`GROUP BY t.id ORDER BY ${sortField} ${orderFilter}`);

    const zeroBasedPage = Math.max(0, page - 1);

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

export const getTodoById: RequestHandler = async (req, res, next) => {
  const { id } = req.params;

  try {
    const todo = await db.oneOrNone(
      `${todosWithCategoriesQuery}
        ${todoCategoriesJoin}
        WHERE t.id = $1 AND t.created_by = $2 AND t.is_deleted = false
        GROUP BY t.id`,
      [id, req.user?.id],
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

export const createTodo: RequestHandler = async (req, res, next) => {
  const { title, done, categories } = req.body;

  try {
    const todo = await db.tx(async (t) => {
      const todoResult = await t.one(
        `INSERT INTO tasks(title, done, created_by) 
            VALUES($1, $2, $3) 
            RETURNING id, title, done, created_by`,
        [title, done === true, req.user?.id],
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
      [todo.id, req.user?.id],
    );

    res.status(201).json(todoWithCategories);
  } catch (error) {
    next(error);
  }
};

export const updateTodo: RequestHandler = async (req, res, next) => {
  const { id } = req.params;
  const { title, done, categories } = req.body;

  try {
    const updatedTodo = await db.oneOrNone(
      `UPDATE tasks
        SET title = COALESCE($1, title),
            done = COALESCE($2, done)
        WHERE id = $3 AND created_by = $4
        RETURNING id, title, done;`,
      [title, done, id, req.user?.id],
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

export const deleteTodo: RequestHandler = async (req, res, next) => {
  const { id } = req.params;

  try {
    const result = await db.oneOrNone(
      "UPDATE tasks SET is_deleted = true WHERE id = $1 AND created_by = $2 RETURNING id",
      [id, req.user?.id],
    );

    if (!result) {
      return res.status(404).send({ message: "Todo not found" });
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
