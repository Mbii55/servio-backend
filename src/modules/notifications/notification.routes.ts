import { Router } from "express";
import { auth } from "../../middleware/auth.middleware";
import {
  getMyNotificationsHandler,
  getMyUnreadCountHandler,
  markAllReadHandler,
  markOneReadHandler,
} from "./notification.controller";

const router = Router();

// Provider portal notifications
router.get("/", auth("provider"), getMyNotificationsHandler);
router.get("/unread-count", auth("provider"), getMyUnreadCountHandler);
router.post("/mark-all-read", auth("provider"), markAllReadHandler);
router.patch("/:id/read", auth("provider"), markOneReadHandler);

export default router;
