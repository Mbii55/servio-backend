// src/modules/notifications/notification.controller.ts
import { Request, Response } from "express";
import {
  getUnreadCount,
  listMyNotifications,
  markAllRead,
  markOneRead,
} from "./notification.repository";

export const getMyNotificationsHandler = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    const limit = Math.min(parseInt(req.query.limit as string) || 30, 100);
    const items = await listMyNotifications(user.userId, limit);

    return res.json(items);
  } catch (e) {
    console.error("getMyNotificationsHandler:", e);
    return res.status(500).json({ message: "Server error" });
  }
};

export const getMyUnreadCountHandler = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    const count = await getUnreadCount(user.userId);
    return res.json({ count });
  } catch (e) {
    console.error("getMyUnreadCountHandler:", e);
    return res.status(500).json({ message: "Server error" });
  }
};

export const markAllReadHandler = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    await markAllRead(user.userId);
    return res.json({ ok: true });
  } catch (e) {
    console.error("markAllReadHandler:", e);
    return res.status(500).json({ message: "Server error" });
  }
};

export const markOneReadHandler = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    const { id } = req.params;
    const updated = await markOneRead(user.userId, id);

    if (!updated) return res.status(404).json({ message: "Notification not found" });
    return res.json(updated);
  } catch (e) {
    console.error("markOneReadHandler:", e);
    return res.status(500).json({ message: "Server error" });
  }
};
