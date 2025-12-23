// src/modules/profile/profile.routes.ts
import { Router } from "express";
import { getProfile, updateProfile } from "./profile.controller";
import { auth } from "../../middleware/auth.middleware";

const router = Router();

// Get current user profile
router.get("/", auth(), getProfile);

// Update profile (providers only)
router.put("/", auth(), updateProfile);

export default router;