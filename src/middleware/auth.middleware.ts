import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { UserRole } from "../modules/users/user.types";

export interface AuthPayload {
  userId: string;
  email: string;
  role: UserRole;
}

export function auth(requiredRole: UserRole | null = null) {
  return (req: Request, res: Response, next: NextFunction) => {
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
      (req as any).user = payload; // or use your type augmentation

      if (requiredRole && payload.role !== requiredRole) {
        return res.status(403).json({ message: "Forbidden" });
      }

      next();
    } catch (err) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }
  };
}
