// src/modules/categories/category.routes.ts
import { Router } from "express";
import {
  listCategories,
  getCategory,
  createCategoryHandler,
  updateCategoryHandler,
  deleteCategoryHandler,
} from "./category.controller";
import { auth } from "../../middleware/auth.middleware";

const router = Router();

// Public
router.get("/", listCategories);
router.get("/:idOrSlug", getCategory);

// Admin-only
router.post("/", auth("admin"), createCategoryHandler);
router.patch("/:id", auth("admin"), updateCategoryHandler);
router.delete("/:id", auth("admin"), deleteCategoryHandler);

export default router;
