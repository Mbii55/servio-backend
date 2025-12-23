// src/modules/upload/upload.routes.ts
import { Router } from "express";
import { auth } from "../../middleware/auth.middleware";
import { upload } from "../../config/multer";
import {
  testCloudinaryHandler,
  uploadImageHandler,
  uploadMultipleImagesHandler,
  deleteImageHandler,
} from "./upload.controller";

const router = Router();

// Test endpoint
router.get("/test", testCloudinaryHandler);

// Upload single image
router.post(
  "/image",
  auth(),
  upload.single("image"),
  uploadImageHandler
);

// Upload multiple images (max 5)
router.post(
  "/images",
  auth(),
  upload.array("images", 5),
  uploadMultipleImagesHandler
);

// Delete image
router.delete(
  "/image/:publicId",
  auth(),
  deleteImageHandler
);

export default router;