import type { RequestHandler } from "express";
import { db } from "../prisma/db";

export const getCategories: RequestHandler = async (req, res, next) => {
  try {
    const categories = await db.orm.public.Categories.where({
      createdBy: req.user?.id,
    })
      .orderBy((p) => p.createdAt.desc())
      .all();

    return res.json({
      data: categories,
    });
  } catch (error) {
    next(error);
  }
};

export const getCategoryById: RequestHandler = async (req, res, next) => {
  const { id } = req.params;

  try {
    const category = await db.orm.public.Categories.where({
      createdBy: req.user?.id,
      id: +id,
    })
      .orderBy((p) => p.createdAt.desc())
      .first();

    if (category) {
      res.json(category);
    } else {
      res.status(404).send({ message: "Category not found" });
    }
  } catch (error) {
    next(error);
  }
};

export const createCategory: RequestHandler = async (req, res, next) => {
  const { name } = req.body;

  try {
    const category = await db.orm.public.Categories.create({
      name,
      createdBy: req.user?.id,
    });

    res.status(201).json(category);
  } catch (error) {
    next(error);
  }
};

export const updateCategory: RequestHandler = async (req, res, next) => {
  const { id } = req.params;
  const { name } = req.body;

  try {
    const updatedCategory = await db.orm.public.Categories.where({
      id: +id,
      createdBy: req.user?.id,
    }).update({
      name,
    });

    if (updatedCategory) {
      return res.status(200).json(updatedCategory);
    } else {
      return res.status(404).json({ message: "Category not found" });
    }
  } catch (error) {
    next(error);
  }
};

export const deleteCategory: RequestHandler = async (req, res, next) => {
  const { id } = req.params;

  try {
    const result = await db.orm.public.Categories.where({
      id: +id,
      createdBy: req.user?.id,
    }).delete();

    if (!result) {
      return res.status(404).send({ message: "Category not found" });
    }

    res.status(204).send();
  } catch (error) {
    next(error);
  }
};
