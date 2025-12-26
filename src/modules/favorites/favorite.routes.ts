// src/modules/favorites/favorite.routes.ts

import { Router } from "express";
import { auth } from "../../middleware/auth.middleware";
import {
  addFavoriteHandler,
  getFavoriteStatusHandler,
  listMyFavoritesHandler,
  removeFavoriteHandler,
  toggleFavoriteHandler,
} from "./favorite.controller";

const router = Router();

// List all favorites (with optional type filter)
// GET /api/v1/favorites?type=service or ?type=provider or no param for all
router.get("/", auth(null), listMyFavoritesHandler);

// Service favorites
router.get("/status/:serviceId", auth(null), getFavoriteStatusHandler);
router.post("/:serviceId", auth(null), addFavoriteHandler);
router.post("/:serviceId/toggle", auth(null), toggleFavoriteHandler);
router.delete("/:serviceId", auth(null), removeFavoriteHandler);

// Provider favorites
router.get("/provider/status/:providerId", auth(null), getFavoriteStatusHandler);
router.post("/provider/:providerId", auth(null), addFavoriteHandler);
router.post("/provider/:providerId/toggle", auth(null), toggleFavoriteHandler);
router.delete("/provider/:providerId", auth(null), removeFavoriteHandler);

export default router;