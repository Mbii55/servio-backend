import { Request, Response } from "express";
import { AuthPayload } from "../../middleware/auth.middleware";
import { getAdminDashboardStats } from "./adminDashboard.repository";

export async function getAdminDashboardStatsHandler(req: Request, res: Response) {
  try {
    const user = (req as any).user as AuthPayload | undefined;
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    if (user.role !== "admin") return res.status(403).json({ error: "Forbidden" });

    const stats = await getAdminDashboardStats();
    return res.json(stats);
  } catch (err) {
    console.error("getAdminDashboardStatsHandler error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}
