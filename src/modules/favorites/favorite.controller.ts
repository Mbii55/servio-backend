// src/modules/favorites/favorite.controller.ts

import { Request, Response } from "express";
import { AuthPayload } from "../../middleware/auth.middleware";
import { getServiceById } from "../services/service.repository";
import { findUserById } from "../users/user.repository";
import {
  addFavorite,
  addProviderFavorite,
  isProviderFavorited,
  isServiceFavorited,
  listFavoritesForUser,
  removeFavorite,
  removeProviderFavorite,
} from "./favorite.repository";
import { FavoriteType } from "./favorite.types";

function getUser(req: Request): AuthPayload {
  return (req as any).user as AuthPayload;
}

export const listMyFavoritesHandler = async (req: Request, res: Response) => {
  try {
    const { userId } = getUser(req);
    const type = req.query.type as FavoriteType | undefined;
    
    const favorites = await listFavoritesForUser(userId, type);
    return res.json(favorites);
  } catch (err) {
    console.error("listMyFavoritesHandler error:", err);
    return res.status(500).json({ message: "Failed to load favorites" });
  }
};

export const getFavoriteStatusHandler = async (req: Request, res: Response) => {
  try {
    const { userId } = getUser(req);
    const { serviceId, providerId } = req.params;

    if (serviceId) {
      const isFav = await isServiceFavorited(userId, serviceId);
      return res.json({ serviceId, is_favorite: isFav, type: 'service' });
    }

    if (providerId) {
      const isFav = await isProviderFavorited(userId, providerId);
      return res.json({ providerId, is_favorite: isFav, type: 'provider' });
    }

    return res.status(400).json({ message: "serviceId or providerId is required" });
  } catch (err) {
    console.error("getFavoriteStatusHandler error:", err);
    return res.status(500).json({ message: "Failed to check favorite status" });
  }
};

export const addFavoriteHandler = async (req: Request, res: Response) => {
  try {
    const { userId } = getUser(req);
    const serviceId = req.params.serviceId ?? req.body?.service_id;
    const providerId = req.params.providerId ?? req.body?.provider_id;

    if (serviceId) {
      const service = await getServiceById(serviceId);
      if (!service || service.is_active === false) {
        return res.status(404).json({ message: "Service not found" });
      }
      const favorite = await addFavorite(userId, serviceId);
      return res.status(201).json(favorite);
    }

    if (providerId) {
      const provider = await findUserById(providerId);
      if (!provider || provider.role !== "provider" || provider.status !== "active") {
        return res.status(404).json({ message: "Provider not found" });
      }
      const favorite = await addProviderFavorite(userId, providerId);
      return res.status(201).json(favorite);
    }

    return res.status(400).json({ message: "serviceId or providerId is required" });
  } catch (err) {
    console.error("addFavoriteHandler error:", err);
    return res.status(500).json({ message: "Failed to add favorite" });
  }
};

export const removeFavoriteHandler = async (req: Request, res: Response) => {
  try {
    const { userId } = getUser(req);
    const { serviceId, providerId } = req.params;

    if (serviceId) {
      const removed = await removeFavorite(userId, serviceId);
      return res.json({ removed, type: 'service' });
    }

    if (providerId) {
      const removed = await removeProviderFavorite(userId, providerId);
      return res.json({ removed, type: 'provider' });
    }

    return res.status(400).json({ message: "serviceId or providerId is required" });
  } catch (err) {
    console.error("removeFavoriteHandler error:", err);
    return res.status(500).json({ message: "Failed to remove favorite" });
  }
};

export const toggleFavoriteHandler = async (req: Request, res: Response) => {
  try {
    const { userId } = getUser(req);
    const { serviceId, providerId } = req.params;

    if (serviceId) {
      const already = await isServiceFavorited(userId, serviceId);

      if (already) {
        await removeFavorite(userId, serviceId);
        return res.json({ serviceId, is_favorite: false, type: 'service' });
      }

      const service = await getServiceById(serviceId);
      if (!service || service.is_active === false) {
        return res.status(404).json({ message: "Service not found" });
      }

      await addFavorite(userId, serviceId);
      return res.json({ serviceId, is_favorite: true, type: 'service' });
    }

    if (providerId) {
      const already = await isProviderFavorited(userId, providerId);

      if (already) {
        await removeProviderFavorite(userId, providerId);
        return res.json({ providerId, is_favorite: false, type: 'provider' });
      }

      const provider = await findUserById(providerId);
      if (!provider || provider.role !== "provider" || provider.status !== "active") {
        return res.status(404).json({ message: "Provider not found" });
      }

      await addProviderFavorite(userId, providerId);
      return res.json({ providerId, is_favorite: true, type: 'provider' });
    }

    return res.status(400).json({ message: "serviceId or providerId is required" });
  } catch (err) {
    console.error("toggleFavoriteHandler error:", err);
    return res.status(500).json({ message: "Failed to toggle favorite" });
  }
};