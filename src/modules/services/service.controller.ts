// src/modules/services/service.controller.ts
import { Request, Response } from "express";
import {
  listActiveServices,
  getServiceById,
  listServicesByProvider,
  createService,
  updateService,
  deactivateService,
} from "./service.repository";
import { CreateServiceInput, UpdateServiceInput } from "./service.types";
import { AuthPayload } from "../../middleware/auth.middleware";

export const listServicesHandler = async (req: Request, res: Response) => {
  try {
    const { categoryId, search, limit, offset } = req.query;

    const services = await listActiveServices({
      categoryId: categoryId as string | undefined,
      search: search as string | undefined,
      limit: limit ? Number(limit) : 20,
      offset: offset ? Number(offset) : 0,
    });

    return res.json(services);
  } catch (error) {
    console.error("listServicesHandler error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

export const getServiceHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const service = await getServiceById(id);

    if (!service) {
      return res.status(404).json({ message: "Service not found" });
    }

    return res.json(service);
  } catch (error) {
    console.error("getServiceHandler error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

export const listMyServicesHandler = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as AuthPayload | undefined;
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const services = await listServicesByProvider(user.userId);
    return res.json(services);
  } catch (error) {
    console.error("listMyServicesHandler error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

export const createServiceHandler = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as AuthPayload | undefined;
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const {
      category_id,
      title,
      description,
      base_price,
      duration_minutes,
      images,
      is_active,
    } = req.body as Partial<CreateServiceInput>;

    if (!category_id || !title || !description || base_price === undefined) {
      return res.status(400).json({
        message: "category_id, title, description, base_price are required",
      });
    }

    const service = await createService(user.userId, {
      category_id,
      title,
      description,
      base_price,
      duration_minutes,
      images,
      is_active,
    });

    return res.status(201).json(service);
  } catch (error) {
    console.error("createServiceHandler error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

export const updateServiceHandler = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as AuthPayload | undefined;
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { id } = req.params;
    const body = req.body as UpdateServiceInput;

    // Optional: you can enforce that only owner provider or admin updates.
    // For now we assume middleware or later checks handle that.

    const updated = await updateService(id, body);
    if (!updated) {
      return res.status(404).json({ message: "Service not found" });
    }

    return res.json(updated);
  } catch (error) {
    console.error("updateServiceHandler error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

export const deleteServiceHandler = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as AuthPayload | undefined;
    if (!user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { id } = req.params;

    const updated = await deactivateService(id);
    if (!updated) {
      return res.status(404).json({ message: "Service not found" });
    }

    return res.json({ message: "Service deactivated" });
  } catch (error) {
    console.error("deleteServiceHandler error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};
