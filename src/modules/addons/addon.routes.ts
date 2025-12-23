// src/modules/addons/addon.routes.ts
import { Router } from "express";
import { auth } from "../../middleware/auth.middleware";
import {
  listAddonsHandler,
  createAddonHandler,
  updateAddonHandler,
  deleteAddonHandler,
} from "./addon.controller";

const router = Router();

// Get addons for a service (public)
router.get("/service/:serviceId", listAddonsHandler);

// Provider operations
router.post("/service/:serviceId", auth("provider"), createAddonHandler);
router.patch("/:id", auth("provider"), updateAddonHandler);
router.delete("/:id", auth("provider"), deleteAddonHandler);

export default router;