// src/modules/auth/auth.routes.ts
import { Router } from "express";
import { register, login, getMe, updateMe, savePushToken, forgotPassword, resetPassword, } from "./auth.controller";
import { auth } from "../../middleware/auth.middleware";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.get("/me", auth(), getMe);
router.patch("/me", auth(), updateMe);
router.post("/push-token", auth(), savePushToken);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

export default router;
