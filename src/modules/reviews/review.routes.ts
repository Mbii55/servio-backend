import { Router } from "express";
import { auth } from "../../middleware/auth.middleware";
import {
  createReviewHandler,
  getServiceReviewsHandler,
  getProviderReviewsHandler,
  getMyReviewsHandler,
  addProviderResponseHandler,
  canReviewBookingHandler,
  adminListReviewsHandler,
  adminToggleVisibilityHandler,
  adminToggleFlagHandler,
  adminDeleteReviewHandler,
} from "./review.controller";

const router = Router();

/* ======================================================
   CUSTOMER ROUTES
====================================================== */

// Create a review (customer only, completed bookings)
router.post("/", auth("customer"), createReviewHandler);

// Check if can review a booking
router.get("/can-review/:bookingId", auth("customer"), canReviewBookingHandler);

/* ======================================================
   PUBLIC ROUTES (No auth required)
====================================================== */

// Get reviews for a specific service
router.get("/service/:serviceId", getServiceReviewsHandler);

// Get reviews for a specific provider
router.get("/provider/:providerId", getProviderReviewsHandler);

/* ======================================================
   PROVIDER ROUTES
====================================================== */

// Get my reviews (current provider)
router.get("/my-reviews", auth("provider"), getMyReviewsHandler);

// Respond to a review
router.post("/:reviewId/response", auth("provider"), addProviderResponseHandler);

/* ======================================================
   ADMIN ROUTES
====================================================== */

// List all reviews with filters
router.get("/admin/all", auth("admin"), adminListReviewsHandler);

// Toggle visibility
router.patch("/admin/:reviewId/visibility", auth("admin"), adminToggleVisibilityHandler);

// Flag/unflag review
router.patch("/admin/:reviewId/flag", auth("admin"), adminToggleFlagHandler);

// Delete review
router.delete("/admin/:reviewId", auth("admin"), adminDeleteReviewHandler);

export default router;