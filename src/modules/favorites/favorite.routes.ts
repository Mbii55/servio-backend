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

// All favorites endpoints require authentication (customer/provider/admin)
router.get("/", auth(null), listMyFavoritesHandler);

// Status: GET /api/v1/favorites/status/:serviceId
router.get("/status/:serviceId", auth(null), getFavoriteStatusHandler);

// Add: POST /api/v1/favorites/:serviceId
router.post("/:serviceId", auth(null), addFavoriteHandler);

// Toggle: POST /api/v1/favorites/:serviceId/toggle
router.post("/:serviceId/toggle", auth(null), toggleFavoriteHandler);

// Remove: DELETE /api/v1/favorites/:serviceId
router.delete("/:serviceId", auth(null), removeFavoriteHandler);

export default router;
