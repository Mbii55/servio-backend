// src/modules/auth/auth.controller.ts
import { Request, Response } from "express";
import pool from "../../config/database";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { sendPasswordResetEmail } from "./auth.mailer";
import {
  createUser,
  findUserByEmail,
  findUserById,
  updateLastLogin,
  updateUserProfile,
} from "../users/user.repository";
import { UserRole } from "../users/user.types";
import { AuthPayload } from "../../middleware/auth.middleware";
import { 
  createBusinessProfile, 
  getBusinessProfileByUserId 
} from '../businessProfiles/businessProfile.repository';
import { updateUserPushToken } from "../users/user.repository";
import {
  createPasswordResetToken,
  deleteExpiredTokensForUser,
  findValidPasswordResetToken,
  markPasswordResetTokenUsed,
} from "./passwordReset.repository";

import { sendProviderRegistrationNotification } from "../../utils/email/sendProviderRegistrationNotification";

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
      business_name,
      business_description,
      business_logo,
    } = req.body;

    // Validation
    if (!email || !password || !first_name || !last_name) {
      return res.status(400).json({ 
        error: 'email, password, first_name, last_name are required' 
      });
    }

    // For providers, business_name is required
    if (role === 'provider' && !business_name) {
      return res.status(400).json({ 
        error: 'business_name is required for service providers' 
      });
    }

    // Check if user already exists
    const existingUser = await findUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const user = await createUser({
      email,
      passwordHash,
      role: role || 'customer',
      firstName: first_name,
      lastName: last_name,
      phone,
    });

    // If provider, create business profile
    let businessProfile = null;
    if (role === 'provider') {
      businessProfile = await createBusinessProfile({
        userId: user.id,
        businessName: business_name,
        businessDescription: business_description,
        businessLogo: business_logo,
      });

      // ✅ NEW: Send admin notification email
      try {
        await sendProviderRegistrationNotification({
          providerName: `${first_name} ${last_name}`,
          providerEmail: email,
          providerPhone: phone,
          businessName: business_name,
          businessDescription: business_description,
          userId: user.id,
          businessProfileId: businessProfile.id,
        });
        
        console.log(`✅ Admin notification sent for new provider: ${business_name}`);
      } catch (emailError) {
        // Log the error but don't fail registration
        console.error('Failed to send admin notification email:', emailError);
        // Registration continues successfully even if email fails
      }
    }

    // Generate token
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );

    // Remove password from response
    const { password_hash, ...userWithoutPassword } = user;

    res.status(201).json({
      token,
      user: userWithoutPassword,
      businessProfile,
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
};



const SUSPENDED_MESSAGE =
  "Your account is suspended due to suspicious activity, contact our support team at support@servio.com.";
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password }: { email: string; password: string } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "email and password are required" });
    }

    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(400).json({ error: "Invalid credentials" });
    }

    // ✅ BLOCK SUSPENDED USERS (BEFORE password check)
    if (user.status === "suspended") {
      return res.status(403).json({ message: SUSPENDED_MESSAGE });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ error: "Invalid credentials" });
    }
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      console.error("JWT_SECRET is not set");
      return res
        .status(500)
        .json({ error: "Server configuration error (JWT)" });
    }

    const payload: AuthPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
    };

    const token = jwt.sign(payload, secret, { expiresIn: "7d" });

    await updateLastLogin(user.id);

    // Get business profile if user is a provider
    let businessProfile = null;
    if (user.role === 'provider') {
      businessProfile = await getBusinessProfileByUserId(user.id);
    }

    return res.json({
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
      businessProfile,
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ error: "Server error" });
  }
};

export const getMe = async (req: Request, res: Response) => {
  try {
    const authUser = (req as any).user as AuthPayload | undefined;
    if (!authUser) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const user = await findUserById(authUser.userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Get business profile if user is a provider
    let businessProfile = null;
    if (user.role === 'provider') {
      businessProfile = await getBusinessProfileByUserId(user.id);
    }

    return res.json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        first_name: user.first_name,
        last_name: user.last_name,
        phone: user.phone,
        status: user.status,
        profile_image: user.profile_image,
        created_at: user.created_at,
      },
      businessProfile,
    });
  } catch (error) {
    console.error("getMe error:", error);
    return res.status(500).json({ error: "Server error" });
  }
};

export const updateMe = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as AuthPayload | undefined;
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const { first_name, last_name, phone, profile_image } = req.body as {
      first_name?: string;
      last_name?: string;
      phone?: string | null;
      profile_image?: string | null;
    };

    // Basic validation (keep it simple)
    if (first_name !== undefined && !String(first_name).trim()) {
      return res.status(400).json({ error: "first_name cannot be empty" });
    }
    if (last_name !== undefined && !String(last_name).trim()) {
      return res.status(400).json({ error: "last_name cannot be empty" });
    }

    const updated = await updateUserProfile(user.userId, {
      first_name: first_name?.trim(),
      last_name: last_name?.trim(),
      phone: phone === undefined ? undefined : phone,
      profile_image: profile_image === undefined ? undefined : profile_image,
    });

    // if nothing updated, just return current
    if (!updated) {
      const current = await findUserById(user.userId);
      return res.json({ user: current });
    }

    return res.json({ user: updated });
  } catch (e: any) {
    console.error("updateMe error:", e);
    return res.status(500).json({ error: "Server error" });
  }
};

export const savePushToken = async (req: Request, res: Response) => {
  try {
    const authUser = (req as any).user as AuthPayload | undefined;
    if (!authUser) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { expo_push_token } = req.body as { expo_push_token?: string };

    if (!expo_push_token || typeof expo_push_token !== "string") {
      return res.status(400).json({ error: "expo_push_token is required" });
    }

    // Optional: basic validation for Expo format
    if (!expo_push_token.startsWith("ExponentPushToken[") && !expo_push_token.startsWith("ExpoPushToken[")) {
      return res.status(400).json({ error: "Invalid Expo push token format" });
    }

    const updated = await updateUserPushToken(authUser.userId, expo_push_token);
    if (!updated) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.json({ ok: true });
  } catch (error: any) {
    console.error("savePushToken error:", error);
    return res.status(500).json({ error: "Server error" });
  }
};

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();

    // Always respond 200 to avoid leaking which emails exist
    if (!email) {
      return res.status(200).json({ message: "If the email exists, a reset link was sent." });
    }

    const user = await findUserByEmail(email);

    // same response even if not found
    if (!user) {
      return res.status(200).json({ message: "If the email exists, a reset link was sent." });
    }

    // optional: block suspended users from reset
    if (user.status === "suspended") {
      return res.status(200).json({ message: "If the email exists, a reset link was sent." });
    }

    // optional cleanup
    await deleteExpiredTokensForUser(user.id);

    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 mins

    await createPasswordResetToken({
      userId: user.id,
      tokenHash,
      expiresAt,
    });

    const baseUrl = process.env.PARTNER_WEB_URL || "http://localhost:3000";
    const resetUrl = `${baseUrl}/reset-password?token=${rawToken}&email=${encodeURIComponent(email)}`;

    await sendPasswordResetEmail({
      to: email,
      name: user.first_name,
      resetUrl,
    });

    return res.status(200).json({ message: "If the email exists, a reset link was sent." });
  } catch (error) {
    console.error("forgotPassword error:", error);
    // Still return generic success to prevent enumeration
    return res.status(200).json({ message: "If the email exists, a reset link was sent." });
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const token = String(req.body.token || "").trim();
    const password = String(req.body.password || "");

    if (!email || !token || password.length < 6) {
      return res.status(400).json({ error: "Invalid request" });
    }

    const user = await findUserByEmail(email);
    if (!user) return res.status(400).json({ error: "Invalid or expired token" });

    if (user.status === "suspended") {
      return res.status(403).json({ message: SUSPENDED_MESSAGE });
    }

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
    const resetRow = await findValidPasswordResetToken({
      userId: user.id,
      tokenHash,
    });

    if (!resetRow) {
      return res.status(400).json({ error: "Invalid or expired token" });
    }

    const newHash = await bcrypt.hash(password, 10);

    // Transaction: update password + mark token used
    await pool.query("BEGIN");
    try {
      await pool.query(`UPDATE users SET password_hash = $1 WHERE id = $2`, [newHash, user.id]);
      await markPasswordResetTokenUsed(resetRow.id);
      await pool.query("COMMIT");
    } catch (e) {
      await pool.query("ROLLBACK");
      throw e;
    }

    return res.status(200).json({ message: "Password updated successfully" });
  } catch (error) {
    console.error("resetPassword error:", error);
    return res.status(500).json({ error: "Server error" });
  }
};
