// src/modules/auth/auth.controller.ts
import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import {
  createUser,
  findUserByEmail,
  findUserById,
  updateLastLogin,
} from "../users/user.repository";
import { UserRole } from "../users/user.types";
import { AuthPayload } from "../../middleware/auth.middleware";

const DEFAULT_ROLE: UserRole = "customer";

export const register = async (req: Request, res: Response) => {
  try {
    const {
      email,
      password,
      first_name,
      last_name,
      phone,
      role,
    }: {
      email: string;
      password: string;
      first_name: string;
      last_name: string;
      phone?: string;
      role?: UserRole;
    } = req.body;

    if (!email || !password || !first_name || !last_name) {
      return res
        .status(400)
        .json({ message: "email, password, first_name, last_name are required" });
    }

    const existing = await findUserByEmail(email);
    if (existing) {
      return res.status(400).json({ message: "Email already in use" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const newUser = await createUser({
      email,
      passwordHash,
      role: role || DEFAULT_ROLE,
      firstName: first_name,
      lastName: last_name,
      phone,
    });

    return res.status(201).json({
      message: "User registered successfully",
      user: {
        id: newUser.id,
        email: newUser.email,
        role: newUser.role,
        first_name: newUser.first_name,
        last_name: newUser.last_name,
        phone: newUser.phone,
        status: newUser.status,
      },
    });
  } catch (error) {
    console.error("Register error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password }: { email: string; password: string } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "email and password are required" });
    }

    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error("JWT_SECRET is not set");
      return res
        .status(500)
        .json({ message: "Server configuration error (JWT)" });
    }

    const payload: AuthPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    const token = jwt.sign(payload, secret, { expiresIn: "7d" });

    await updateLastLogin(user.id);

    return res.json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        first_name: user.first_name,
        last_name: user.last_name,
        phone: user.phone,
        status: user.status,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

export const getMe = async (req: Request, res: Response) => {
  try {
    const authUser = (req as any).user as AuthPayload | undefined;
    if (!authUser) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user = await findUserById(authUser.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json({
      id: user.id,
      email: user.email,
      role: user.role,
      first_name: user.first_name,
      last_name: user.last_name,
      phone: user.phone,
      status: user.status,
      profile_image: user.profile_image,
      created_at: user.created_at,
    });
  } catch (error) {
    console.error("getMe error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};
