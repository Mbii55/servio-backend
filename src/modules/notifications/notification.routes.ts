// src/modules/notifications/notification.routes.ts
import { Router } from "express";
import { auth } from "../../middleware/auth.middleware";
import {
  getMyNotificationsHandler,
  getMyUnreadCountHandler,
  markAllReadHandler,
  markOneReadHandler,
} from "./notification.controller";

const router = Router();

// Get my notifications
router.get("/", auth(null), getMyNotificationsHandler);

// Get unread count
router.get("/unread-count", auth(null), getMyUnreadCountHandler);

// ✅ FIXED: Changed endpoint to match frontend
router.patch("/mark-all-read", auth(null), markAllReadHandler);

// Mark one as read
router.patch("/:id/read", auth(null), markOneReadHandler);

export default router;