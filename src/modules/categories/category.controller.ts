// src/modules/categories/category.controller.ts
import { Request, Response } from "express";
import {
  getActiveCategories,
  getCategoryById,
  getCategoryBySlug,
  createCategory,
  updateCategory,
  deactivateCategory,
} from "./category.repository";
import { CreateCategoryInput, UpdateCategoryInput } from "./category.types";

export const listCategories = async (_req: Request, res: Response) => {
  try {
    const categories = await getActiveCategories();
    return res.json(categories);
  } catch (error) {
    console.error("listCategories error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

export const getCategory = async (req: Request, res: Response) => {
  try {
    const { idOrSlug } = req.params;

    let category =
      idOrSlug.length === 36
        ? await getCategoryById(idOrSlug)
        : await getCategoryBySlug(idOrSlug);

    if (!category) {
      return res.status(404).json({ message: "Category not found" });
    }

    return res.json(category);
  } catch (error) {
    console.error("getCategory error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

export const createCategoryHandler = async (req: Request, res: Response) => {
  try {
    const body = req.body as Partial<CreateCategoryInput>;

    if (!body.name || !body.slug) {
      return res
        .status(400)
        .json({ message: "name and slug are required" });
    }

    const existing = await getCategoryBySlug(body.slug);
    if (existing) {
      return res.status(400).json({ message: "Slug already in use" });
    }

    const category = await createCategory({
      name: body.name,
      slug: body.slug,
      description: body.description,
      icon: body.icon,
      is_active: body.is_active,
      sort_order: body.sort_order,
    });

    return res.status(201).json(category);
  } catch (error) {
    console.error("createCategoryHandler error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

export const updateCategoryHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const body = req.body as UpdateCategoryInput;

    const updated = await updateCategory(id, body);
    if (!updated) {
      return res.status(404).json({ message: "Category not found" });
    }

    return res.json(updated);
  } catch (error) {
    console.error("updateCategoryHandler error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

export const deleteCategoryHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updated = await deactivateCategory(id);

    if (!updated) {
      return res.status(404).json({ message: "Category not found" });
    }

    return res.json({ message: "Category deactivated" });
  } catch (error) {
    console.error("deleteCategoryHandler error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};
