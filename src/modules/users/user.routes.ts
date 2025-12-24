// src/modules/users/user.routes.ts
import { Router } from "express";
import { auth } from "../../middleware/auth.middleware";
import * as UserController from "./user.controller";

const router = Router();

/* ADMIN ONLY */
router.get("/", auth("admin"), UserController.adminGetUsers);
router.patch("/:id/status", auth("admin"), UserController.adminUpdateUserStatus);

export default router;
