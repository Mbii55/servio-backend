// src/modules/verification/verification.routes.ts
import { Router } from "express";
import { auth } from "../../middleware/auth.middleware";
import { uploadVerificationDocument } from "../../config/multer"; // ✅ verification-specific upload
import {
  uploadDocumentHandler,
  getMyVerificationStatusHandler,
  deleteMyDocumentHandler,
  adminGetPendingHandler,
  adminGetAllHandler,
  adminGetDetailsHandler,
  adminUpdateStatusHandler,
  adminGetHistoryHandler,
  adminGetStatsHandler,
  adminSearchVerificationsHandler,
  getMyDocumentViewUrlHandler,
  // Add the new handler import
  adminGetDocumentViewUrlHandler,
} from "./verification.controller";

const router = Router();

/* ======================================================
   PROVIDER ROUTES
====================================================== */

// Upload verification document (CR or Trade License)
router.post(
  "/upload",
  auth("provider"),
  uploadVerificationDocument.single("document"), // ✅ allows PDFs, 10MB limit
  uploadDocumentHandler
);

// Get my verification status and documents
router.get("/my-status", auth("provider"), getMyVerificationStatusHandler);

// Get signed URL for provider's document
router.get(
  "/documents/:documentId/view-url",
  auth("provider"),
  getMyDocumentViewUrlHandler
);

// Delete my document (only if not verified)
router.delete("/documents/:documentId", auth("provider"), deleteMyDocumentHandler);

/* ======================================================
   ADMIN ROUTES
====================================================== */

// Get verification statistics
router.get("/admin/stats", auth("admin"), adminGetStatsHandler);

// Search/filter verifications
router.get("/admin/search", auth("admin"), adminSearchVerificationsHandler);

// Get all pending verifications
router.get("/admin/pending", auth("admin"), adminGetPendingHandler);

// Get all verifications with filtering
router.get("/admin/all", auth("admin"), adminGetAllHandler);

// Get verification history for a business profile
router.get("/admin/:id/history", auth("admin"), adminGetHistoryHandler);

// Update verification status (approve/reject business profile)
router.patch("/admin/:id/status", auth("admin"), adminUpdateStatusHandler);

// Get signed URL for admin to view any document
router.get(
  "/admin/documents/:documentId/view-url",
  auth("admin"),
  adminGetDocumentViewUrlHandler
);

// Get single verification details (MUST come before /:id/history and /:id/status)
router.get("/admin/:id", auth("admin"), adminGetDetailsHandler);

export default router;