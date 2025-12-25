import { Request, Response } from "express";
import { AuthPayload } from "../../middleware/auth.middleware";
import { findUserById } from "../users/user.repository";
import {
  getBusinessProfileByUserId,
  updateBusinessProfile,
} from "../businessProfiles/businessProfile.repository";
import { deleteCloudinaryImageByUrl } from "../../utils/cloudinary-delete-by-url";
import { uploadToCloudinary } from "../../utils/cloudinary-upload";

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

export const deleteLogo = async (req: Request, res: Response) => {
  try {
    const authUser = (req as any).user as AuthPayload;

    // Only providers can delete logo
    if (authUser.role !== 'provider') {
      return res.status(403).json({ error: "Only providers can delete business logo" });
    }

    // Get current business profile
    const businessProfile = await getBusinessProfileByUserId(authUser.userId);
    
    if (!businessProfile) {
      return res.status(404).json({ error: "Business profile not found" });
    }

    // Delete image from Cloudinary if exists
    if (businessProfile.business_logo) {
      await deleteCloudinaryImageByUrl(businessProfile.business_logo);
    }

    // Update business profile to remove logo
    const updatedProfile = await updateBusinessProfile(authUser.userId, {
      businessLogo: '', // Use empty string
    });

    return res.json({
      message: "Logo deleted successfully",
      businessProfile: updatedProfile,
    });
  } catch (error) {
    console.error("Delete logo error:", error);
    return res.status(500).json({ error: "Server error" });
  }
};

export const updateProfile = async (req: Request, res: Response) => {
  try {
    const authUser = (req as any).user as AuthPayload;
    
    let business_name: string;
    let business_description: string;
    let business_logo: string | undefined;

    // Check if this is a multipart/form-data request (file upload)
    if (req.headers['content-type']?.includes('multipart/form-data')) {
      // Handle FormData with file upload
      const multer = require('multer');
      const storage = multer.memoryStorage();
      const upload = multer({ storage });
      
      // Use multer to parse the form data
      await new Promise<void>((resolve, reject) => {
        upload.fields([{ name: 'business_logo', maxCount: 1 }])(req as any, res as any, (err: any) => {
          if (err) {
            console.error('Multer error:', err);
            if (err.code === 'LIMIT_FILE_SIZE') {
              return res.status(400).json({ error: 'File too large. Maximum size is 2MB.' });
            }
            return reject(err);
          }
          resolve();
        });
      });

      // Get form fields from body
      business_name = req.body.business_name;
      business_description = req.body.business_description || '';

      // Handle file upload if present
      const files = (req as any).files;
      if (files && files.business_logo && files.business_logo[0]) {
        const file = files.business_logo[0];
        
        // Upload to Cloudinary
        const uploadResult = await uploadToCloudinary(file.buffer, {
          folder: 'logos',
          width: 400,
          height: 400,
          crop: 'fill'
        });
        
        business_logo = uploadResult.secure_url;
      } else if (req.body.business_logo !== undefined) {
        // If business_logo field exists but is empty string (removing logo)
        business_logo = req.body.business_logo;
      }
      // If no business_logo field at all, business_logo remains undefined
    } else {
      // Handle regular JSON request
      ({ business_name, business_description, business_logo } = req.body);
    }

    // Only providers can update business profile
    if (authUser.role !== 'provider') {
      return res.status(403).json({ error: "Only providers can update business profile" });
    }

    // Validate input
    if (!business_name || !business_name.trim()) {
      return res.status(400).json({ error: "business_name is required" });
    }

    // Get current profile to check for existing logo
    const currentProfile = await getBusinessProfileByUserId(authUser.userId);
    
    // Handle business logo deletion
    if (business_logo === '' && currentProfile?.business_logo) {
      // If logo is being set to empty string and there was a previous logo, delete it
      await deleteCloudinaryImageByUrl(currentProfile.business_logo);
    }

    // Prepare update data
    const updateData: any = {
      businessName: business_name,
      businessDescription: business_description,
    };

    // Handle business logo
    if (business_logo === '') {
      updateData.businessLogo = ''; // Empty string means remove logo
    } else if (business_logo !== undefined) {
      updateData.businessLogo = business_logo; // New logo URL
    }
    // If business_logo is undefined, don't include it (keeps existing)

    // Update business profile
    const updatedProfile = await updateBusinessProfile(authUser.userId, updateData);

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