// src/modules/favorites/favorite.controller.ts

import { Request, Response } from "express";
import { AuthPayload } from "../../middleware/auth.middleware";
import { getServiceById } from "../services/service.repository";
import {
  addFavorite,
  isServiceFavorited,
  listFavoritesForUser,
  removeFavorite,
} from "./favorite.repository";

function getUser(req: Request): AuthPayload {
  return (req as any).user as AuthPayload;
}

export const listMyFavoritesHandler = async (req: Request, res: Response) => {
  try {
    const { userId } = getUser(req);
    const favorites = await listFavoritesForUser(userId);
    return res.json(favorites);
  } catch (err) {
    console.error("listMyFavoritesHandler error:", err);
    return res.status(500).json({ message: "Failed to load favorites" });
  }
};

export const getFavoriteStatusHandler = async (req: Request, res: Response) => {
  try {
    const { userId } = getUser(req);
    const serviceId = req.params.serviceId;

    if (!serviceId) return res.status(400).json({ message: "serviceId is required" });

    const isFav = await isServiceFavorited(userId, serviceId);
    return res.json({ serviceId, is_favorite: isFav });
  } catch (err) {
    console.error("getFavoriteStatusHandler error:", err);
    return res.status(500).json({ message: "Failed to check favorite status" });
  }
};

export const addFavoriteHandler = async (req: Request, res: Response) => {
  try {
    const { userId } = getUser(req);
    const serviceId = req.params.serviceId ?? req.body?.service_id;

    if (!serviceId) return res.status(400).json({ message: "serviceId is required" });

    // Ensure service exists + active (avoid favoriting invalid services)
    const service = await getServiceById(serviceId);
    if (!service || service.is_active === false) {
      return res.status(404).json({ message: "Service not found" });
    }

    const favorite = await addFavorite(userId, serviceId);
    return res.status(201).json(favorite);
  } catch (err) {
    console.error("addFavoriteHandler error:", err);
    return res.status(500).json({ message: "Failed to add favorite" });
  }
};

export const removeFavoriteHandler = async (req: Request, res: Response) => {
  try {
    const { userId } = getUser(req);
    const serviceId = req.params.serviceId;

    if (!serviceId) return res.status(400).json({ message: "serviceId is required" });

    const removed = await removeFavorite(userId, serviceId);
    return res.json({ removed });
  } catch (err) {
    console.error("removeFavoriteHandler error:", err);
    return res.status(500).json({ message: "Failed to remove favorite" });
  }
};

/**
 * Convenience endpoint for UI:
 * - If already favorite => remove
 * - Else => add
 */
export const toggleFavoriteHandler = async (req: Request, res: Response) => {
  try {
    const { userId } = getUser(req);
    const serviceId = req.params.serviceId;

    if (!serviceId) return res.status(400).json({ message: "serviceId is required" });

    const already = await isServiceFavorited(userId, serviceId);

    if (already) {
      await removeFavorite(userId, serviceId);
      return res.json({ serviceId, is_favorite: false });
    }

    const service = await getServiceById(serviceId);
    if (!service || service.is_active === false) {
      return res.status(404).json({ message: "Service not found" });
    }

    await addFavorite(userId, serviceId);
    return res.json({ serviceId, is_favorite: true });
  } catch (err) {
    console.error("toggleFavoriteHandler error:", err);
    return res.status(500).json({ message: "Failed to toggle favorite" });
  }
};
