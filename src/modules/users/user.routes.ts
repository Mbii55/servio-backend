// src/modules/users/user.routes.ts
import { Router } from "express";
import { auth } from "../../middleware/auth.middleware";
import {
  getProviders,
  getProvidersBasic,
  getProviderProfile,
  searchProvidersAdvanced,
  adminGetUsers,
  adminUpdateUserStatus,
} from "./user.controller";

const router = Router();

/* PUBLIC/CUSTOMER ENDPOINTS */
// Search providers - Must come BEFORE /providers/:id to avoid route conflicts
router.get("/providers/search", searchProvidersAdvanced);

// Main endpoint with services and business info
router.get("/providers", getProviders);

// Legacy endpoint without services (if needed)
router.get("/providers/basic", getProvidersBasic);

// Single provider profile
router.get("/providers/:id", getProviderProfile);

/* ADMIN ONLY ENDPOINTS */
router.get("/", auth("admin"), adminGetUsers);
router.patch("/:id/status", auth("admin"), adminUpdateUserStatus);

export default router;