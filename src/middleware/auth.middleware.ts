// src/middleware/auth.middleware.ts
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { UserRole } from "../modules/users/user.types";
import { findUserById } from "../modules/users/user.repository";

export interface AuthPayload {
  userId: string;
  email: string;
  role: UserRole;
}

const SUSPENDED_MESSAGE =
  "Your account is suspended due to suspicious activity, contact our support team at support@servio.com.";

export function auth(requiredRole: UserRole | null = null) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No token provided" });
    }

    const token = authHeader.split(" ")[1];

    try {
      const secret = process.env.JWT_SECRET;
      if (!secret) {
        console.error("JWT_SECRET is not set");
        return res
          .status(500)
          .json({ message: "Server configuration error (JWT)" });
      }

      const payload = jwt.verify(token, secret) as AuthPayload;

      // ✅ Fetch user to enforce suspended status
      const user = await findUserById(payload.userId);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      // ✅ Block suspended users globally
      if (user.status === "suspended") {
        return res.status(403).json({ message: SUSPENDED_MESSAGE });
      }

      (req as any).user = payload;

      if (requiredRole && payload.role !== requiredRole) {
        return res.status(403).json({ message: "Forbidden" });
      }

      return next();
    } catch (err) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }
  };
}
