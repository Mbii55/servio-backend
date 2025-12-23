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

// 🔹 Image limit for each service
const MAX_SERVICE_IMAGES = 5;

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
    return res.status(500).json({ error: "Server error" });
  }
};

export const getServiceHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const service = await getServiceById(id);

    if (!service) {
      return res.status(404).json({ error: "Service not found" });
    }

    return res.json(service);
  } catch (error) {
    console.error("getServiceHandler error:", error);
    return res.status(500).json({ error: "Server error" });
  }
};

export const listMyServicesHandler = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as AuthPayload | undefined;
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const services = await listServicesByProvider(user.userId);
    return res.json(services);
  } catch (error) {
    console.error("listMyServicesHandler error:", error);
    return res.status(500).json({ error: "Server error" });
  }
};

export const createServiceHandler = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as AuthPayload | undefined;
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
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
        error: "category_id, title, description, base_price are required",
      });
    }

    // 🔹 Validate images array and enforce max limit
    let imagesArray: string[] | undefined;
    if (images !== undefined) {
      if (!Array.isArray(images)) {
        return res
          .status(400)
          .json({ error: "images must be an array of URLs" });
      }
      if (images.length > MAX_SERVICE_IMAGES) {
        return res.status(400).json({
          error: `You can upload up to ${MAX_SERVICE_IMAGES} images per service`,
        });
      }
      imagesArray = images as string[];
    }

    const service = await createService(user.userId, {
      category_id,
      title,
      description,
      base_price,
      duration_minutes,
      images: imagesArray,
      is_active,
    });

    return res.status(201).json(service);
  } catch (error) {
    console.error("createServiceHandler error:", error);
    return res.status(500).json({ error: "Server error" });
  }
};

export const updateServiceHandler = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as AuthPayload | undefined;
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { id } = req.params;
    const body = req.body as UpdateServiceInput;

    // 🔹 If images are provided in the update, validate and enforce limit
    if (body.images !== undefined) {
      if (!Array.isArray(body.images)) {
        return res
          .status(400)
          .json({ error: "images must be an array of URLs" });
      }
      if (body.images.length > MAX_SERVICE_IMAGES) {
        return res.status(400).json({
          error: `You can upload up to ${MAX_SERVICE_IMAGES} images per service`,
        });
      }
    }

    const updated = await updateService(id, body);
    if (!updated) {
      return res.status(404).json({ error: "Service not found" });
    }

    return res.json(updated);
  } catch (error) {
    console.error("updateServiceHandler error:", error);
    return res.status(500).json({ error: "Server error" });
  }
};

export const deleteServiceHandler = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as AuthPayload | undefined;
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { id } = req.params;

    const updated = await deactivateService(id);
    if (!updated) {
      return res.status(404).json({ error: "Service not found" });
    }

    return res.json({ message: "Service deactivated" });
  } catch (error) {
    console.error("deleteServiceHandler error:", error);
    return res.status(500).json({ error: "Server error" });
  }
};
