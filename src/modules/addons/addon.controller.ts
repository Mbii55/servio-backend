// src/modules/addons/addon.controller.ts
import { Request, Response } from "express";
import { AuthPayload } from "../../middleware/auth.middleware";
import { getServiceByIdForProvider } from "../services/service.repository";
import {
  listAddonsByService,
  getAddonById,
  createAddon,
  updateAddon,
  deleteAddon,
} from "./addon.repository";
import { CreateAddonInput, UpdateAddonInput } from "./addon.types";

export const listAddonsHandler = async (req: Request, res: Response) => {
  try {
    const { serviceId } = req.params;

    const addons = await listAddonsByService(serviceId);
    return res.json(addons);
  } catch (error) {
    console.error("listAddonsHandler error:", error);
    return res.status(500).json({ error: "Server error" });
  }
};

export const createAddonHandler = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as AuthPayload | undefined;
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { serviceId } = req.params;
    const { name, description, price, is_active } = req.body as CreateAddonInput;

    if (!name || price === undefined) {
      return res.status(400).json({ error: "name and price are required" });
    }

    // Verify service belongs to provider
    const service = await getServiceByIdForProvider(serviceId);
    if (!service) {
      return res.status(404).json({ error: "Service not found" });
    }
    if (service.provider_id !== user.userId) {
      return res.status(403).json({ error: "Not authorized to add addons to this service" });
    }

    const addon = await createAddon(serviceId, {
      name,
      description,
      price,
      is_active,
    });

    return res.status(201).json(addon);
  } catch (error) {
    console.error("createAddonHandler error:", error);
    return res.status(500).json({ error: "Server error" });
  }
};

export const updateAddonHandler = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as AuthPayload | undefined;
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { id } = req.params;
    const body = req.body as UpdateAddonInput;

    // Verify addon exists and belongs to provider's service
    const existingAddon = await getAddonById(id);
    if (!existingAddon) {
      return res.status(404).json({ error: "Addon not found" });
    }

    const service = await getServiceByIdForProvider(existingAddon.service_id);
    if (!service || service.provider_id !== user.userId) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const updated = await updateAddon(id, body);
    if (!updated) {
      return res.status(404).json({ error: "Addon not found" });
    }

    return res.json(updated);
  } catch (error) {
    console.error("updateAddonHandler error:", error);
    return res.status(500).json({ error: "Server error" });
  }
};

export const deleteAddonHandler = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as AuthPayload | undefined;
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { id } = req.params;

    // Verify addon exists and belongs to provider's service
    const existingAddon = await getAddonById(id);
    if (!existingAddon) {
      return res.status(404).json({ error: "Addon not found" });
    }

    const service = await getServiceByIdForProvider(existingAddon.service_id);
    if (!service || service.provider_id !== user.userId) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const deleted = await deleteAddon(id);
    if (!deleted) {
      return res.status(404).json({ error: "Addon not found" });
    }

    return res.json({ message: "Addon deleted successfully" });
  } catch (error) {
    console.error("deleteAddonHandler error:", error);
    return res.status(500).json({ error: "Server error" });
  }
};