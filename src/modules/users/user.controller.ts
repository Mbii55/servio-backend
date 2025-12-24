// src/modules/users/user.controller.ts
import { Request, Response } from "express";
import * as UserRepo from "./user.repository";
import { UserRole, UserStatus } from "./user.types";

/* ADMIN — GET ALL USERS (CUSTOMERS & PROVIDERS ONLY) */
export async function adminGetUsers(req: Request, res: Response) {
  try {
    const role = req.query.role as UserRole | undefined;

    // If someone tries role=admin, just return empty (admins are excluded anyway)
    const users = await UserRepo.adminListUsers(role === "admin" ? undefined : role);

    return res.json({ users });
  } catch (err) {
    console.error("adminGetUsers error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}

/* ADMIN — UPDATE USER STATUS */
export async function adminUpdateUserStatus(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { status } = req.body as { status: UserStatus };

    if (!["active", "inactive", "suspended"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const updated = await UserRepo.adminUpdateUserStatus(id, status);

    if (!updated) {
      return res.status(404).json({ error: "User not found (or cannot update admin)" });
    }

    return res.json({ user: updated });
  } catch (err) {
    console.error("adminUpdateUserStatus error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}
