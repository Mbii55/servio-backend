import { Request, Response } from "express";
import { AuthPayload } from "../../middleware/auth.middleware";
import {
  createReview,
  getServiceReviews,
  getProviderReviews,
  addProviderResponse,
  getServiceStatistics,
  getProviderStatistics,
  canReviewBooking,
  adminListAllReviews,
  adminToggleVisibility,
  adminToggleFlag,
  adminDeleteReview,
  adminGetReviewStats,
} from "./review.repository";

/**
 * Customer creates a review
 */
export const createReviewHandler = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as AuthPayload;
    if (!user || user.role !== "customer") {
      return res.status(403).json({ error: "Only customers can create reviews" });
    }

    const { booking_id, rating, comment } = req.body;

    if (!booking_id || !rating) {
      return res.status(400).json({ error: "booking_id and rating are required" });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ error: "Rating must be between 1 and 5" });
    }

    const review = await createReview(user.userId, {
      booking_id,
      rating,
      comment,
    });

    return res.status(201).json(review);
  } catch (error: any) {
    console.error("createReviewHandler error:", error);
    return res.status(400).json({ error: error.message || "Failed to create review" });
  }
};

/**
 * Get reviews for a service
 */
export const getServiceReviewsHandler = async (req: Request, res: Response) => {
  try {
    const { serviceId } = req.params;
    const reviews = await getServiceReviews(serviceId);
    const stats = await getServiceStatistics(serviceId);

    return res.json({ reviews, statistics: stats });
  } catch (error: any) {
    console.error("getServiceReviewsHandler error:", error);
    return res.status(500).json({ error: "Server error" });
  }
};

/**
 * Get reviews for a provider
 */
export const getProviderReviewsHandler = async (req: Request, res: Response) => {
  try {
    const { providerId } = req.params;
    const reviews = await getProviderReviews(providerId);
    const stats = await getProviderStatistics(providerId);

    return res.json({ reviews, statistics: stats });
  } catch (error: any) {
    console.error("getProviderReviewsHandler error:", error);
    return res.status(500).json({ error: "Server error" });
  }
};

/**
 * Get current provider's reviews (for provider portal)
 */
export const getMyReviewsHandler = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as AuthPayload;
    if (!user || user.role !== "provider") {
      return res.status(403).json({ error: "Only providers can access this" });
    }

    const reviews = await getProviderReviews(user.userId);
    const stats = await getProviderStatistics(user.userId);

    return res.json({ reviews, statistics: stats });
  } catch (error: any) {
    console.error("getMyReviewsHandler error:", error);
    return res.status(500).json({ error: "Server error" });
  }
};

/**
 * Provider responds to a review
 */
export const addProviderResponseHandler = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as AuthPayload;
    if (!user || user.role !== "provider") {
      return res.status(403).json({ error: "Only providers can respond to reviews" });
    }

    const { reviewId } = req.params;
    const { response } = req.body;

    if (!response || !response.trim()) {
      return res.status(400).json({ error: "Response cannot be empty" });
    }

    const review = await addProviderResponse(reviewId, user.userId, response);
    return res.json(review);
  } catch (error: any) {
    console.error("addProviderResponseHandler error:", error);
    return res.status(400).json({ error: error.message || "Failed to add response" });
  }
};

/**
 * Check if customer can review a booking
 */
export const canReviewBookingHandler = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as AuthPayload;
    if (!user || user.role !== "customer") {
      return res.status(403).json({ error: "Only customers can check review eligibility" });
    }

    const { bookingId } = req.params;
    const canReview = await canReviewBooking(user.userId, bookingId);

    return res.json({ canReview });
  } catch (error: any) {
    console.error("canReviewBookingHandler error:", error);
    return res.status(500).json({ error: "Server error" });
  }
};

/**
 * ADMIN: List all reviews with filtering
 */
export const adminListReviewsHandler = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as AuthPayload;
    if (!user || user.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }

    const { rating, is_flagged, search } = req.query;

    const reviews = await adminListAllReviews({
      rating: rating ? parseInt(rating as string) : undefined,
      is_flagged: is_flagged === "true" ? true : is_flagged === "false" ? false : undefined,
      search: search as string,
    });

    // ✅ Return in the format expected by frontend
    return res.json({
      reviews: reviews,
      total: reviews.length
    });
  } catch (error: any) {
    console.error("adminListReviewsHandler error:", error);
    return res.status(500).json({ error: "Server error" });
  }
};


/**
 * ADMIN: Toggle review visibility
 */
export const adminToggleVisibilityHandler = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as AuthPayload;
    if (!user || user.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }

    const { reviewId } = req.params;
    const review = await adminToggleVisibility(reviewId);

    return res.json(review);
  } catch (error: any) {
    console.error("adminToggleVisibilityHandler error:", error);
    return res.status(400).json({ error: error.message || "Failed to toggle visibility" });
  }
};

/**
 * ADMIN: Toggle review flag
 */
export const adminToggleFlagHandler = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as AuthPayload;
    if (!user || user.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }

    const { reviewId } = req.params;
    const { reason } = req.body;

    const review = await adminToggleFlag(reviewId, user.userId, reason);
    return res.json(review);
  } catch (error: any) {
    console.error("adminToggleFlagHandler error:", error);
    return res.status(400).json({ error: error.message || "Failed to toggle flag" });
  }
};

/**
 * ADMIN: Delete review
 */
export const adminDeleteReviewHandler = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as AuthPayload;
    if (!user || user.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }

    const { reviewId } = req.params;
    await adminDeleteReview(reviewId);

    return res.json({ message: "Review deleted successfully" });
  } catch (error: any) {
    console.error("adminDeleteReviewHandler error:", error);
    return res.status(400).json({ error: error.message || "Failed to delete review" });
  }
};

/**
 * ADMIN: Get review statistics
 */
export const adminGetStatsHandler = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as AuthPayload;
    if (!user || user.role !== "admin") {
      return res.status(403).json({ error: "Admin access required" });
    }

    const stats = await adminGetReviewStats();
    return res.json(stats);
  } catch (error: any) {
    console.error("adminGetStatsHandler error:", error);
    return res.status(500).json({ error: "Server error" });
  }
};
