// src/modules/services/service.routes.ts
import { Router } from "express";
import {
  listServicesHandler,
  getServiceHandler,
  listMyServicesHandler,
  createServiceHandler,
  updateServiceHandler,
  deleteServiceHandler,
} from "./service.controller";
import { auth } from "../../middleware/auth.middleware";

const router = Router();

// Public
router.get("/", listServicesHandler);

// Provider
router.get("/me/mine", auth("provider"), listMyServicesHandler);

// Public (by id)
router.get("/:id", getServiceHandler);

// Provider (write operations)
router.post("/", auth("provider"), createServiceHandler);
router.patch("/:id", auth("provider"), updateServiceHandler);
router.delete("/:id", auth("provider"), deleteServiceHandler);

export default router;
