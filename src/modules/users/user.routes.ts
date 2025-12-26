// src/modules/users/user.routes.ts
import { Router } from "express";
import { auth } from "../../middleware/auth.middleware";
import * as UserController from "./user.controller";

const router = Router();

/* PUBLIC/CUSTOMER ENDPOINTS */
// Main endpoint with services and business info
router.get("/providers", UserController.getProviders);

// Legacy endpoint without services (if needed)
router.get("/providers/basic", UserController.getProvidersBasic);

// Search providers
router.get("/providers/search", UserController.searchProviders);

// Single provider profile
router.get("/providers/:id", UserController.getProviderProfile);

/* ADMIN ONLY ENDPOINTS */
router.get("/", auth("admin"), UserController.adminGetUsers);
router.patch("/:id/status", auth("admin"), UserController.adminUpdateUserStatus);

export default router;