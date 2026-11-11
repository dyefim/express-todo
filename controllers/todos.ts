import type { RequestHandler } from "express";
import { db } from "../prisma/db";

import { parseIntParam, parseStringParam } from "../utils/parse";

const sortFields = {
  created_at: "createdAt",
  title: "title",
} as const;

export const getTodos: RequestHandler = async (req, res, next) => {
  try {
    const { order } = req.query;

    const page = parseIntParam(req.query.page, 0);
    const size = parseIntParam(req.query.size, 10);
    const sort = parseStringParam(req.query.sort, undefined);
    const search = parseStringParam(req.query.search, undefined);

    const sortField =
      sort && Object.hasOwn(sortFields, sort)
        ? sortFields[sort as keyof typeof sortFields]
        : "createdAt";
    const direction = order === "desc" ? "desc" : "asc";

    const zeroBasedPage = Math.max(0, page - 1);

    const tasks = db.orm.public.Tasks.where({
      createdBy: req.user?.id,
      isDeleted: false,
    });
    const filtered = search
      ? tasks.where((t) => t.title.ilike(`%${search}%`))
      : tasks;

    const [{ total }, todos] = await Promise.all([
      filtered.aggregate((t) => ({ total: t.count() })),
      filtered
        .orderBy([(t) => t[sortField][direction](), (t) => t.id.asc()])
        .limit(size)
        .offset(zeroBasedPage * size)
        .all(),
    ]);

    return res.json({
      data: todos,
      page: {
        size,
        totalElements: total,
        totalPages: Math.ceil(total / size),
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
    const task = await db.orm.public.Tasks.where({
      id: Number(id),
      createdBy: req.user?.id,
      isDeleted: false,
    })
      .include("taskCategories", (tc) =>
        tc
          .include("category", (c) => c.select("id", "name"))
          .orderBy((c) => c.createdAt.desc()),
      )
      .first();

    if (task) {
      res.json({
        ...task,
        categories: task.taskCategories.map((tc) => tc.category),
      });
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
    const todo = await db.transaction(async (tx) => {
      const todoResult = await tx.orm.public.Tasks.create({
        title,
        done: done === true,
        createdBy: req.user?.id,
      });

      if (Array.isArray(categories) && categories.length > 0) {
        await tx.orm.public.TaskCategories.createAll(
          categories.map((categoryId: number) => ({
            taskId: todoResult.id,
            categoryId,
          })),
        );
      }

      return todoResult;
    });

    const todoWithCategories = await db.orm.public.Tasks.where({
      id: todo.id,
      createdBy: req.user?.id,
      isDeleted: false,
    })
      .include("taskCategories", (tc) =>
        tc
          .include("category", (c) => c.select("id", "name"))
          .orderBy((c) => c.createdAt.desc()),
      )
      .first();

    res.status(201).json(todoWithCategories);
  } catch (error) {
    next(error);
  }
};

export const updateTodo: RequestHandler = async (req, res, next) => {
  const { id } = req.params;
  const { title, done, categories } = req.body;

  try {
    const updatedTodo = await db.orm.public.Tasks.where({
      id: +id,
      createdBy: req.user?.id,
    }).update({
      title: title ?? undefined,
      done: done ?? undefined,
    });

    if (!updatedTodo) {
      return res.status(404).json({ message: "Todo not found" });
    }

    if (Array.isArray(categories)) {
      await db.transaction(async (tx) => {
        await tx.orm.public.TaskCategories.where({
          taskId: +id,
        }).deleteAndCount();

        if (categories.length > 0) {
          await tx.orm.public.TaskCategories.createAll(
            categories.map((categoryId: number) => ({
              taskId: +id,
              categoryId,
            })),
          );
        }
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
    const result = await db.orm.public.Tasks.where({
      id: +id,
      createdBy: req.user?.id,
    }).update({
      isDeleted: true,
    });

    if (!result) {
      return res.status(404).send({ message: "Todo not found" });
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
