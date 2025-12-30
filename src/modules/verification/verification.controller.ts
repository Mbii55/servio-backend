// src/modules/verification/verification.controller.ts
import { Request, Response } from "express";
import { AuthPayload } from "../../middleware/auth.middleware";
import pool from "../../config/database";
import {
  uploadVerificationDocument,
  getProviderVerificationStatus,
  adminGetPendingVerifications,
  adminGetAllVerifications,
  adminGetVerificationDetails,
  adminUpdateVerificationStatus,
  getVerificationHistory,
  getVerificationStatistics,
  deleteVerificationDocument,
  getMyVerificationDocument,
  
} from "./verification.repository";
import { getBusinessProfileByUserId } from "../businessProfiles/businessProfile.repository";
import { uploadToCloudinary } from "../../utils/cloudinary-upload";
import { deleteCloudinaryImageByUrl } from "../../utils/cloudinary-delete-by-url";
import { DocumentType, VerificationStatus } from "./verification.types";
import { createNotification } from "../notifications/notification.repository";
import { sendPushNotificationToUser } from "../../utils/expo-push.service";
import cloudinary from "../../config/cloudinary";
import { sendVerificationApprovedEmail } from "../../utils/email/sendVerificationApprovedEmail";
import { sendVerificationRejectedEmail } from "../../utils/email/sendVerificationRejectedEmail";

// ... (keep all other imports)


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

    if (!document_type) return res.status(400).json({ error: "document_type is required" });

    if (!["commercial_registration", "trade_license", "other"].includes(document_type)) {
      return res.status(400).json({ error: "Invalid document_type" });
    }

    if (!file) return res.status(400).json({ error: "No file uploaded" });

    const businessProfile = await getBusinessProfileByUserId(user.userId);
    if (!businessProfile) return res.status(404).json({ error: "Business profile not found" });

    const isPdf =
      file.mimetype === "application/pdf" || file.originalname.toLowerCase().endsWith(".pdf");

    const uploadResult = await uploadToCloudinary(file.buffer, {
      folder: `servio/verification/${user.userId}`,
      resourceType: isPdf ? "raw" : "image",
    });

    const document = await uploadVerificationDocument({
      business_profile_id: businessProfile.id,
      document_type,
      document_url: uploadResult.secure_url,
      document_name: file.originalname,
      file_size: file.size,
      cloudinary_public_id: uploadResult.public_id, // ✅ important
      cloudinary_resource_type: uploadResult.resource_type, // ✅ "raw" | "image"
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
 * ADMIN: Update business profile verification status
 * ✅ UPDATED: Added email notifications
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

    // Update verification status
    await adminUpdateVerificationStatus(id, user.userId, status, rejection_reason);

    // ✅ Send notifications and emails to provider
    try {
      const businessProfile = await pool.query(
        `
        SELECT 
          bp.user_id, 
          bp.business_name,
          u.email,
          u.first_name,
          u.last_name
        FROM business_profiles bp
        JOIN users u ON u.id = bp.user_id
        WHERE bp.id = $1
        `,
        [id]
      );

      if (businessProfile.rows.length > 0) {
        const providerId = businessProfile.rows[0].user_id;
        const businessName = businessProfile.rows[0].business_name;
        const providerEmail = businessProfile.rows[0].email;
        const providerName = `${businessProfile.rows[0].first_name} ${businessProfile.rows[0].last_name}`;

        if (status === "approved") {
          // Create in-app notification
          await createNotification({
            user_id: providerId,
            type: "verification_approved",
            title: "🎉 Verification Approved!",
            message: `Congratulations! Your business "${businessName}" has been verified. You can now receive bookings from customers.`,
            data: { 
              business_profile_id: id, 
              status: "approved",
              action: "view_dashboard"
            },
          });

          // Send push notification
          await sendPushNotificationToUser({
            userId: providerId,
            title: "🎉 Verification Approved!",
            body: `Your business "${businessName}" is now verified and live!`,
            data: { 
              type: "verification_approved", 
              business_profile_id: id,
              screen: "Dashboard"
            },
          });

          // ✅ NEW: Send approval email
          await sendVerificationApprovedEmail({
            to: providerEmail,
            providerName: providerName,
            businessName: businessName,
          });

          console.log(`✅ Sent approval notifications and email to provider ${providerId}`);

        } else if (status === "rejected") {
          // Create in-app notification
          await createNotification({
            user_id: providerId,
            type: "verification_rejected",
            title: "❌ Verification Rejected",
            message: `Your business "${businessName}" verification was rejected. Reason: ${rejection_reason}. Please update your documents and resubmit.`,
            data: { 
              business_profile_id: id, 
              status: "rejected", 
              reason: rejection_reason,
              action: "view_verification"
            },
          });

          // Send push notification
          await sendPushNotificationToUser({
            userId: providerId,
            title: "❌ Verification Rejected",
            body: `Your business verification was rejected. Please check the details and resubmit.`,
            data: { 
              type: "verification_rejected", 
              business_profile_id: id,
              reason: rejection_reason,
              screen: "BusinessProfile"
            },
          });

          // ✅ NEW: Send rejection email
          await sendVerificationRejectedEmail({
            to: providerEmail,
            providerName: providerName,
            businessName: businessName,
            rejectionReason: rejection_reason || "Please review your documents",
          });

          console.log(`✅ Sent rejection notifications and email to provider ${providerId}`);
        }
      }
    } catch (notificationError) {
      // Log error but don't fail the verification update
      console.error("Error sending verification notifications:", notificationError);
    }

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

/**
 * ✅ NEW: ADMIN: Search/filter verifications
 */
export const adminSearchVerificationsHandler = async (req: Request, res: Response) => {
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
    console.error("adminSearchVerificationsHandler error:", error);
    return res.status(500).json({ error: "Server error" });
  }
};

/** PROVIDER: Get signed view URL for their document */

export const getMyDocumentViewUrlHandler = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as AuthPayload;
    if (!user || user.role !== "provider") {
      return res.status(403).json({ error: "Only providers can view documents" });
    }

    const { documentId } = req.params;
    const doc = await getMyVerificationDocument(documentId, user.userId);

    if (!doc) return res.status(404).json({ error: "Document not found" });

    // fallback for old rows
    if (!doc.cloudinary_public_id || !doc.cloudinary_resource_type) {
      return res.json({ url: doc.document_url });
    }

    const signedUrl = cloudinary.url(doc.cloudinary_public_id, {
      resource_type: doc.cloudinary_resource_type, // "raw" | "image"
      secure: true,
      sign_url: true,
    });

    return res.json({ url: signedUrl });
  } catch (e: any) {
    console.error("getMyDocumentViewUrlHandler error:", e);
    return res.status(500).json({ error: "Server error", detail: e.message });
  }
};



/**
 * ADMIN: Get signed view URL for a document
 */
export const adminGetDocumentViewUrlHandler = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as AuthPayload;
    if (!user || user.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }

    const { documentId } = req.params;
    
    // Get document details
    const result = await pool.query(
      `SELECT * FROM verification_documents WHERE id = $1`,
      [documentId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Document not found" });
    }

    const doc = result.rows[0];

    // fallback for old rows
    if (!doc.cloudinary_public_id || !doc.cloudinary_resource_type) {
      return res.json({ url: doc.document_url });
    }

    const signedUrl = cloudinary.url(doc.cloudinary_public_id, {
      resource_type: doc.cloudinary_resource_type,
      secure: true,
      sign_url: true,
    });

    return res.json({ url: signedUrl });
  } catch (e: any) {
    console.error("adminGetDocumentViewUrlHandler error:", e);
    return res.status(500).json({ error: "Server error", detail: e.message });
  }
};