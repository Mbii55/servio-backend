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
} from "./service.controller";
import { auth } from "../../middleware/auth.middleware";
import { upload } from "../../config/multer";

const router = Router();
const MAX_SERVICE_IMAGES = 5;

// Public endpoints
router.get("/", listServicesHandler);

// ✅ put admin routes BEFORE "/:id"
router.get("/admin/:id", auth("admin"), getServiceAdminHandler);
router.get("/admin", auth("admin"), listServicesAdminHandler);

router.get("/:id", getServiceHandler);


// Provider endpoints
router.get("/me/mine", auth("provider"), listMyServicesHandler);

// Create service with file upload support
router.post(
  "/", 
  auth("provider"),
  (req, res, next) => {
    console.log('Service creation request received');
    console.log('Content-Type:', req.headers['content-type']);
    next();
  },
  upload.array("images", MAX_SERVICE_IMAGES), // Handle up to 5 images
  createServiceHandler
);

// Update service with file upload support
router.patch(
  "/:id", 
  auth("provider"),
  upload.array("images", MAX_SERVICE_IMAGES), // Handle up to 5 images
  updateServiceHandler
);

// service.routes.ts
router.patch(
  "/admin/:id/status",
  auth("admin"),
  adminUpdateServiceStatusHandler
);


// Delete service
router.delete("/:id", auth("provider"), deleteServiceHandler);

export default router;