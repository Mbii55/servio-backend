// src/modules/verification/verification.controller.ts
import { Request, Response } from "express";
import { AuthPayload } from "../../middleware/auth.middleware";
import {
  uploadVerificationDocument,
  getProviderVerificationStatus,
  adminGetPendingVerifications,
  adminGetAllVerifications,
  adminGetVerificationDetails,
  adminVerifyDocument,
  adminUpdateVerificationStatus,
  getVerificationHistory,
  getVerificationStatistics,
  deleteVerificationDocument,
} from "./verification.repository";
import { getBusinessProfileByUserId } from "../businessProfiles/businessProfile.repository";
import { uploadToCloudinary } from "../../utils/cloudinary-upload";
import { deleteCloudinaryImageByUrl } from "../../utils/cloudinary-delete-by-url";
import { DocumentType, VerificationStatus } from "./verification.types";

/**
 * PROVIDER: Upload verification document (CR AND Trade License - BOTH required)
 */
export const uploadDocumentHandler = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as AuthPayload;
    if (!user || user.role !== "provider") {
      return res.status(403).json({ error: "Only providers can upload documents" });
    }

    const { document_type } = req.body as { document_type: DocumentType };
    const file = (req as any).file as Express.Multer.File;

    if (!document_type) {
      return res.status(400).json({ error: "document_type is required" });
    }

    if (!["commercial_registration", "trade_license", "other"].includes(document_type)) {
      return res.status(400).json({ error: "Invalid document_type" });
    }

    if (!file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // Get business profile
    const businessProfile = await getBusinessProfileByUserId(user.userId);
    if (!businessProfile) {
      return res.status(404).json({ error: "Business profile not found" });
    }

    // Upload to Cloudinary
    const uploadResult = await uploadToCloudinary(file.buffer, {
      folder: `servio/verification/${user.userId}`,
    });

    // Save to database
    const document = await uploadVerificationDocument({
      business_profile_id: businessProfile.id,
      document_type,
      document_url: uploadResult.secure_url,
      document_name: file.originalname,
      file_size: file.size,
    });

    return res.status(201).json({
      message: "Document uploaded successfully",
      document,
    });
  } catch (error: any) {
    console.error("uploadDocumentHandler error:", error);
    return res.status(500).json({ error: "Server error", detail: error.message });
  }
};

/**
 * PROVIDER: Get their verification status and documents
 */
export const getMyVerificationStatusHandler = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as AuthPayload;
    if (!user || user.role !== "provider") {
      return res.status(403).json({ error: "Only providers can view verification status" });
    }

    const status = await getProviderVerificationStatus(user.userId);

    if (!status) {
      return res.status(404).json({ error: "Business profile not found" });
    }

    return res.json(status);
  } catch (error: any) {
    console.error("getMyVerificationStatusHandler error:", error);
    return res.status(500).json({ error: "Server error" });
  }
};

/**
 * PROVIDER: Delete their document (only if not verified)
 */
export const deleteMyDocumentHandler = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as AuthPayload;
    if (!user || user.role !== "provider") {
      return res.status(403).json({ error: "Only providers can delete documents" });
    }

    const { documentId } = req.params;

    // TODO: Optionally delete from Cloudinary before deleting from DB
    // Get document URL first, then delete from Cloudinary

    const deleted = await deleteVerificationDocument(documentId, user.userId);

    if (!deleted) {
      return res.status(404).json({
        error: "Document not found or already verified",
      });
    }

    return res.json({ message: "Document deleted successfully" });
  } catch (error: any) {
    console.error("deleteMyDocumentHandler error:", error);
    return res.status(500).json({ error: "Server error" });
  }
};

/**
 * ADMIN: Get all pending verifications
 */
export const adminGetPendingHandler = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as AuthPayload;
    if (!user || user.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }

    const verifications = await adminGetPendingVerifications();

    return res.json({ verifications });
  } catch (error: any) {
    console.error("adminGetPendingHandler error:", error);
    return res.status(500).json({ error: "Server error" });
  }
};

/**
 * ADMIN: Get all verifications with filtering
 */
export const adminGetAllHandler = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as AuthPayload;
    if (!user || user.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }

    const { status, search } = req.query as {
      status?: VerificationStatus;
      search?: string;
    };

    const verifications = await adminGetAllVerifications({ status, search });

    return res.json({ verifications });
  } catch (error: any) {
    console.error("adminGetAllHandler error:", error);
    return res.status(500).json({ error: "Server error" });
  }
};

/**
 * ADMIN: Get single verification details
 */
export const adminGetDetailsHandler = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as AuthPayload;
    if (!user || user.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }

    const { id } = req.params;

    const verification = await adminGetVerificationDetails(id);

    if (!verification) {
      return res.status(404).json({ error: "Verification not found" });
    }

    return res.json(verification);
  } catch (error: any) {
    console.error("adminGetDetailsHandler error:", error);
    return res.status(500).json({ error: "Server error" });
  }
};

/**
 * ADMIN: Verify or reject a single document
 */
export const adminVerifyDocumentHandler = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as AuthPayload;
    if (!user || user.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }

    const { documentId } = req.params;
    const { is_verified, rejection_reason } = req.body as {
      is_verified: boolean;
      rejection_reason?: string;
    };

    if (is_verified === undefined) {
      return res.status(400).json({ error: "is_verified is required" });
    }

    const document = await adminVerifyDocument(
      documentId,
      user.userId,
      is_verified,
      rejection_reason
    );

    return res.json({
      message: is_verified ? "Document verified" : "Document rejected",
      document,
    });
  } catch (error: any) {
    console.error("adminVerifyDocumentHandler error:", error);
    return res.status(400).json({ error: error.message || "Server error" });
  }
};

/**
 * ADMIN: Update business profile verification status
 */
export const adminUpdateStatusHandler = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as AuthPayload;
    if (!user || user.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }

    const { id } = req.params;
    const { status, rejection_reason } = req.body as {
      status: VerificationStatus;
      rejection_reason?: string;
    };

    if (!status) {
      return res.status(400).json({ error: "status is required" });
    }

    if (!["pending", "approved", "rejected", "resubmitted"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    if (status === "rejected" && !rejection_reason) {
      return res.status(400).json({
        error: "rejection_reason is required when rejecting",
      });
    }

    await adminUpdateVerificationStatus(id, user.userId, status, rejection_reason);

    return res.json({
      message: "Verification status updated successfully",
    });
  } catch (error: any) {
    console.error("adminUpdateStatusHandler error:", error);
    return res.status(500).json({ error: "Server error" });
  }
};

/**
 * ADMIN: Get verification history
 */
export const adminGetHistoryHandler = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as AuthPayload;
    if (!user || user.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }

    const { id } = req.params;

    const history = await getVerificationHistory(id);

    return res.json({ history });
  } catch (error: any) {
    console.error("adminGetHistoryHandler error:", error);
    return res.status(500).json({ error: "Server error" });
  }
};

/**
 * ADMIN: Get verification statistics
 */
export const adminGetStatsHandler = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as AuthPayload;
    if (!user || user.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }

    const stats = await getVerificationStatistics();

    return res.json(stats);
  } catch (error: any) {
    console.error("adminGetStatsHandler error:", error);
    return res.status(500).json({ error: "Server error" });
  }
};