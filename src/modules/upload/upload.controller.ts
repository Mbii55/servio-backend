// src/modules/upload/upload.controller.ts
import { Request, Response } from "express";
import cloudinary from "../../config/cloudinary";
import { uploadToCloudinary } from "../../utils/cloudinary-upload";
import { AuthPayload } from "../../middleware/auth.middleware";

export const testCloudinaryHandler = async (req: Request, res: Response) => {
  try {
    const result = await cloudinary.api.ping();
    
    return res.json({
      message: "Cloudinary connected successfully!",
      status: result.status,
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    });
  } catch (error: any) {
    console.error("Cloudinary test error:", error);
    return res.status(500).json({
      error: "Cloudinary connection failed",
      details: error.message,
    });
  }
};

/**
 * Upload single image
 * POST /api/v1/upload/image
 */
export const uploadImageHandler = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as AuthPayload | undefined;
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Check if file exists
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const { folder } = req.body;

    // Upload to Cloudinary
    const result = await uploadToCloudinary(req.file.buffer, {
      folder: folder || `servio/${user.userId}`,
    });

    return res.status(201).json({
      message: "Image uploaded successfully",
      url: result.secure_url,
      public_id: result.public_id,
      width: result.width,
      height: result.height,
      format: result.format,
      size: result.bytes,
    });
  } catch (error: any) {
    console.error("Image upload error:", error);
    return res.status(500).json({
      error: "Image upload failed",
      details: error.message,
    });
  }
};

/**
 * Upload multiple images (up to 5)
 * POST /api/v1/upload/images
 */
export const uploadMultipleImagesHandler = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as AuthPayload | undefined;
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Check if files exist
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ error: "No files uploaded" });
    }

    const { folder } = req.body;

    // Upload all files to Cloudinary
    const uploadPromises = files.map(file =>
      uploadToCloudinary(file.buffer, {
        folder: folder || `servio/${user.userId}`,
      })
    );

    const results = await Promise.all(uploadPromises);

    const uploadedImages = results.map(result => ({
      url: result.secure_url,
      public_id: result.public_id,
      width: result.width,
      height: result.height,
      format: result.format,
      size: result.bytes,
    }));

    return res.status(201).json({
      message: `${uploadedImages.length} images uploaded successfully`,
      images: uploadedImages,
    });
  } catch (error: any) {
    console.error("Multiple images upload error:", error);
    return res.status(500).json({
      error: "Images upload failed",
      details: error.message,
    });
  }
};

/**
 * Delete image from Cloudinary
 * DELETE /api/v1/upload/image/:publicId
 */
export const deleteImageHandler = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as AuthPayload | undefined;
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { publicId } = req.params;

    if (!publicId) {
      return res.status(400).json({ error: "Public ID is required" });
    }

    // Delete from Cloudinary
    const result = await cloudinary.uploader.destroy(publicId);

    if (result.result === 'ok') {
      return res.json({
        message: "Image deleted successfully",
        result: result.result,
      });
    } else {
      return res.status(404).json({
        error: "Image not found or already deleted",
      });
    }
  } catch (error: any) {
    console.error("Image delete error:", error);
    return res.status(500).json({
      error: "Image deletion failed",
      details: error.message,
    });
  }
};