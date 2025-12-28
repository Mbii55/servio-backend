// src/modules/business_profiles/business_profiles.routes.ts
import { Router } from "express";
import { auth } from "../../middleware/auth.middleware";
import * as C from "./business_profiles.controller";

const router = Router();

// ✅ Admin: List all providers
router.get("/admin", auth("admin"), C.adminListProviders);

// ✅ NEW: Admin: Get single provider profile (MUST come before /:id/active and /:id/commission)
router.get("/admin/:id", auth("admin"), C.adminGetProviderProfile);

// ✅ Admin: Toggle active status
router.patch("/admin/:id/active", auth("admin"), C.adminToggleActive);

// ✅ NEW: Admin: Update commission rate for a provider
router.patch("/admin/:id/commission", auth("admin"), C.adminUpdateCommissionRate);

// ✅ NEW: Admin: Get commission rate for a provider
router.get("/admin/:id/commission", auth("admin"), C.adminGetProviderCommissionRate);

export default router;