import { Router } from "express";
import { getProfile, updateProfile, deleteLogo } from "./profile.controller";
import { auth } from "../../middleware/auth.middleware";

const router = Router();

// Get current user profile
router.get("/", auth(), getProfile);

// Update profile (providers only) - now supports both JSON and FormData
router.put("/", auth(), updateProfile);

// Delete logo (providers only)
router.delete("/logo", auth(), deleteLogo);

export default router;