// src/modules/profile/profile.controller.ts
import { Request, Response } from "express";
import { AuthPayload } from "../../middleware/auth.middleware";
import { findUserById } from "../users/user.repository";
import {
  getBusinessProfileByUserId,
  updateBusinessProfile,
} from "../businessProfiles/businessProfile.repository";

export const getProfile = async (req: Request, res: Response) => {
  try {
    const authUser = (req as any).user as AuthPayload;
    
    const user = await findUserById(authUser.userId);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Get business profile if provider
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
        updated_at: user.updated_at,
      },
      businessProfile,
    });
  } catch (error) {
    console.error("Get profile error:", error);
    return res.status(500).json({ error: "Server error" });
  }
};

export const updateProfile = async (req: Request, res: Response) => {
  try {
    const authUser = (req as any).user as AuthPayload;
    const { business_name, business_description, business_logo } = req.body;

    // Only providers can update business profile
    if (authUser.role !== 'provider') {
      return res.status(403).json({ error: "Only providers can update business profile" });
    }

    // Validate input
    if (!business_name || !business_name.trim()) {
      return res.status(400).json({ error: "business_name is required" });
    }

    // Update business profile
    const updatedProfile = await updateBusinessProfile(authUser.userId, {
      businessName: business_name,
      businessDescription: business_description,
      businessLogo: business_logo,
    });

    if (!updatedProfile) {
      return res.status(404).json({ error: "Business profile not found" });
    }

    return res.json({
      message: "Profile updated successfully",
      businessProfile: updatedProfile,
    });
  } catch (error) {
    console.error("Update profile error:", error);
    return res.status(500).json({ error: "Server error" });
  }
};