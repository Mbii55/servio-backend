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
import { 
  createBusinessProfile, 
  getBusinessProfileByUserId 
} from '../businessProfiles/businessProfile.repository';

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
      business_logo, // Added
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
        businessLogo: business_logo, // Added
      });
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