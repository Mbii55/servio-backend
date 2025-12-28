import { Router } from "express";
import { auth } from "../../middleware/auth.middleware";
import { getAdminDashboardStatsHandler } from "./adminDashboard.controller";

const router = Router();

// GET /api/v1/admin/dashboard/stats
router.get("/stats", auth("admin"), getAdminDashboardStatsHandler);

export default router;
