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

// ✅ Changed from auth("provider") to auth(null) - allows all authenticated users
router.get("/", auth(null), getMyNotificationsHandler);
router.get("/unread-count", auth(null), getMyUnreadCountHandler);
router.patch("/read-all", auth(null), markAllReadHandler); // ✅ Changed POST to PATCH
router.patch("/:id/read", auth(null), markOneReadHandler);

export default router;