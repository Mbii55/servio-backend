// src/modules/services/service.routes.ts
import { Router } from "express";
import {
  listServicesHandler,
  getServiceHandler,
  listMyServicesHandler,
  createServiceHandler,
  updateServiceHandler,
  deleteServiceHandler,
  adminUpdateServiceStatusHandler,
  getServiceAdminHandler,
  listServicesAdminHandler,
  adminDeleteServiceHandler,
  adminRestoreServiceHandler, // ✅ NEW
} from "./service.controller";
import { auth } from "../../middleware/auth.middleware";
import { upload } from "../../config/multer";

const router = Router();
const MAX_SERVICE_IMAGES = 5;

// Public endpoints
router.get("/", listServicesHandler);

// ✅ Admin routes BEFORE "/:id"
router.get("/admin/:id", auth("admin"), getServiceAdminHandler);
router.get("/admin", auth("admin"), listServicesAdminHandler);

router.patch("/admin/:id/status", auth("admin"), adminUpdateServiceStatusHandler);

// ✅ Archive (admin remove) - expects { reason } in body
router.delete("/admin/:id", auth("admin"), adminDeleteServiceHandler);

// ✅ NEW: Restore archived service (admin)
router.patch("/admin/:id/restore", auth("admin"), adminRestoreServiceHandler);

// Public single service
router.get("/:id", getServiceHandler);

// Provider endpoints
router.get("/me/mine", auth("provider"), listMyServicesHandler);

// Create service with file upload support
router.post(
  "/",
  auth("provider"),
  (req, res, next) => {
    console.log("Service creation request received");
    console.log("Content-Type:", req.headers["content-type"]);
    next();
  },
  upload.array("images", MAX_SERVICE_IMAGES),
  createServiceHandler
);

// Update service with file upload support
router.patch(
  "/:id",
  auth("provider"),
  upload.array("images", MAX_SERVICE_IMAGES),
  updateServiceHandler
);

// Delete service (provider)
router.delete("/:id", auth("provider"), deleteServiceHandler);

export default router;
