// src/modules/business_profiles/business_profiles.routes.ts
import { Router } from "express";
import { auth } from "../../middleware/auth.middleware";
import * as C from "./business_profiles.controller";

const router = Router();

router.get("/admin", auth("admin"), C.adminListProviders);
router.patch("/admin/:id/active", auth("admin"), C.adminToggleActive);

export default router;
