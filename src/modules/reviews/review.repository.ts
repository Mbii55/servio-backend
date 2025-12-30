// src/modules/reviews/review.repository.ts
import pool from "../../config/database";
import { Review, CreateReviewInput, ReviewWithDetails, ReviewStatistics } from "./review.types";

/**
 * Customer creates a review for a completed booking
 */
export async function createReview(
  customerId: string,
  input: CreateReviewInput
): Promise<Review> {
  const { booking_id, rating, comment } = input;

  // Validate booking belongs to customer and is completed
  const bookingCheck = await pool.query(
    `
    SELECT id, customer_id, provider_id, service_id, status
    FROM bookings
    WHERE id = $1
    `,
    [booking_id]
  );

  const booking = bookingCheck.rows[0];

  if (!booking) {
    throw new Error("Booking not found");
  }

  if (booking.customer_id !== customerId) {
    throw new Error("You can only review your own bookings");
  }

  if (booking.status !== "completed") {
    throw new Error("You can only review completed bookings");
  }

  // Check if review already exists
  const existingReview = await pool.query(
    `SELECT id FROM reviews WHERE booking_id = $1`,
    [booking_id]
  );

  if (existingReview.rows.length > 0) {
    throw new Error("You have already reviewed this booking");
  }

  // Create review
  const result = await pool.query<Review>(
    `
    INSERT INTO reviews (
      booking_id,
      customer_id,
      provider_id,
      service_id,
      rating,
      comment
    )
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
    `,
    [booking_id, customerId, booking.provider_id, booking.service_id, rating, comment || null]
  );

  return result.rows[0];
}

/**
 * Get reviews for a specific service
 */
export async function getServiceReviews(serviceId: string): Promise<ReviewWithDetails[]> {
  const result = await pool.query<ReviewWithDetails>(
    `
    SELECT
      r.*,
      u.first_name as customer_first_name,
      u.last_name as customer_last_name,
      u.profile_image as customer_profile_image,
      b.booking_number,
      b.scheduled_date,
      s.title as service_title,
      s.images as service_images
    FROM reviews r
    JOIN users u ON u.id = r.customer_id
    JOIN bookings b ON b.id = r.booking_id
    JOIN services s ON s.id = r.service_id
    WHERE r.service_id = $1
      AND r.is_visible = true
    ORDER BY r.created_at DESC
    `,
    [serviceId]
  );

  return result.rows;
}

/**
 * Get reviews for a specific provider (all their services)
 */
export async function getProviderReviews(providerId: string): Promise<ReviewWithDetails[]> {
  const result = await pool.query<ReviewWithDetails>(
    `
    SELECT
      r.*,
      u.first_name as customer_first_name,
      u.last_name as customer_last_name,
      u.profile_image as customer_profile_image,
      b.booking_number,
      b.scheduled_date,
      s.title as service_title,
      s.images as service_images
    FROM reviews r
    JOIN users u ON u.id = r.customer_id
    JOIN bookings b ON b.id = r.booking_id
    JOIN services s ON s.id = r.service_id
    WHERE r.provider_id = $1
      AND r.is_visible = true
    ORDER BY r.created_at DESC
    `,
    [providerId]
  );

  return result.rows;
}

/**
 * Provider responds to a review
 */
export async function addProviderResponse(
  reviewId: string,
  providerId: string,
  response: string
): Promise<Review> {
  // Verify review belongs to this provider
  const reviewCheck = await pool.query(
    `SELECT id, provider_id FROM reviews WHERE id = $1`,
    [reviewId]
  );

  if (reviewCheck.rows.length === 0) {
    throw new Error("Review not found");
  }

  if (reviewCheck.rows[0].provider_id !== providerId) {
    throw new Error("You can only respond to your own reviews");
  }

  const result = await pool.query<Review>(
    `
    UPDATE reviews
    SET 
      provider_response = $1,
      provider_response_at = CURRENT_TIMESTAMP,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $2
    RETURNING *
    `,
    [response, reviewId]
  );

  return result.rows[0];
}

/**
 * Get service statistics (average rating, count)
 */
export async function getServiceStatistics(serviceId: string): Promise<ReviewStatistics> {
  const result = await pool.query(
    `
    SELECT
      COUNT(*) as total_reviews,
      COALESCE(AVG(rating), 0) as average_rating,
      COUNT(*) FILTER (WHERE rating = 5) as five_star_count,
      COUNT(*) FILTER (WHERE rating = 4) as four_star_count,
      COUNT(*) FILTER (WHERE rating = 3) as three_star_count,
      COUNT(*) FILTER (WHERE rating = 2) as two_star_count,
      COUNT(*) FILTER (WHERE rating = 1) as one_star_count,
      COUNT(*) FILTER (WHERE provider_response IS NOT NULL) as response_count
    FROM reviews
    WHERE service_id = $1
      AND is_visible = true
    `,
    [serviceId]
  );

  return {
    total_reviews: parseInt(result.rows[0].total_reviews),
    average_rating: parseFloat(parseFloat(result.rows[0].average_rating).toFixed(2)),
    five_star_count: parseInt(result.rows[0].five_star_count),
    four_star_count: parseInt(result.rows[0].four_star_count),
    three_star_count: parseInt(result.rows[0].three_star_count),
    two_star_count: parseInt(result.rows[0].two_star_count),
    one_star_count: parseInt(result.rows[0].one_star_count),
    response_count: parseInt(result.rows[0].response_count),
  };
}

/**
 * Get provider statistics (average rating across all services)
 */
export async function getProviderStatistics(providerId: string): Promise<ReviewStatistics> {
  const result = await pool.query(
    `
    SELECT
      COUNT(*) as total_reviews,
      COALESCE(AVG(rating), 0) as average_rating,
      COUNT(*) FILTER (WHERE rating = 5) as five_star_count,
      COUNT(*) FILTER (WHERE rating = 4) as four_star_count,
      COUNT(*) FILTER (WHERE rating = 3) as three_star_count,
      COUNT(*) FILTER (WHERE rating = 2) as two_star_count,
      COUNT(*) FILTER (WHERE rating = 1) as one_star_count,
      COUNT(*) FILTER (WHERE provider_response IS NOT NULL) as response_count
    FROM reviews
    WHERE provider_id = $1
      AND is_visible = true
    `,
    [providerId]
  );

  return {
    total_reviews: parseInt(result.rows[0].total_reviews),
    average_rating: parseFloat(parseFloat(result.rows[0].average_rating).toFixed(2)),
    five_star_count: parseInt(result.rows[0].five_star_count),
    four_star_count: parseInt(result.rows[0].four_star_count),
    three_star_count: parseInt(result.rows[0].three_star_count),
    two_star_count: parseInt(result.rows[0].two_star_count),
    one_star_count: parseInt(result.rows[0].one_star_count),
    response_count: parseInt(result.rows[0].response_count),
  };
}

/**
 * Check if customer can review a booking
 */
export async function canReviewBooking(customerId: string, bookingId: string): Promise<boolean> {
  const result = await pool.query(
    `
    SELECT
      b.id,
      b.customer_id,
      b.status,
      (SELECT COUNT(*)::int FROM reviews WHERE booking_id = b.id) as review_count
    FROM bookings b
    WHERE b.id = $1
      AND b.customer_id = $2
      AND b.status = 'completed'
    `,
    [bookingId, customerId]
  );

  if (result.rows.length === 0) return false;
  return result.rows[0].review_count === 0;
}


/**
 * ADMIN: Get all reviews with filtering
 */
export async function adminListAllReviews(params?: {
  rating?: number;
  is_flagged?: boolean;
  search?: string;
}): Promise<any[]> {
  const { rating, is_flagged, search } = params || {};

  let query = `
    SELECT
      r.id,
      r.booking_id,
      r.customer_id,
      r.provider_id,
      r.service_id,
      r.rating,
      r.comment,
      r.provider_response,
      r.provider_response_at,
      r.is_visible,
      r.is_flagged,
      r.flagged_reason,
      r.created_at,
      r.updated_at,
      b.booking_number,
      CONCAT(u.first_name, ' ', u.last_name) as customer_name,
      u.email as customer_email,
      CONCAT(pu.first_name, ' ', pu.last_name) as provider_name,
      COALESCE(bp.business_name, 'N/A') as provider_business_name,
      s.title as service_title
    FROM reviews r
    JOIN users u ON u.id = r.customer_id
    JOIN users pu ON pu.id = r.provider_id
    JOIN bookings b ON b.id = r.booking_id
    JOIN services s ON s.id = r.service_id
    LEFT JOIN business_profiles bp ON bp.user_id = r.provider_id
    WHERE 1=1
  `;

  const values: any[] = [];
  let paramIndex = 1;

  if (rating) {
    query += ` AND r.rating = $${paramIndex}`;
    values.push(rating);
    paramIndex++;
  }

  if (is_flagged !== undefined) {
    query += ` AND r.is_flagged = $${paramIndex}`;
    values.push(is_flagged);
    paramIndex++;
  }

  if (search) {
    query += ` AND (
      b.booking_number ILIKE $${paramIndex} OR
      u.first_name ILIKE $${paramIndex} OR
      u.last_name ILIKE $${paramIndex} OR
      s.title ILIKE $${paramIndex} OR
      bp.business_name ILIKE $${paramIndex} OR
      r.comment ILIKE $${paramIndex}
    )`;
    values.push(`%${search}%`);
    paramIndex++;
  }

  query += ` ORDER BY r.created_at DESC`;

  const result = await pool.query<any>(query, values);
  return result.rows;
}

/**
 * ADMIN: Toggle review visibility
 */
export async function adminToggleVisibility(reviewId: string): Promise<Review> {
  const result = await pool.query<Review>(
    `
    UPDATE reviews
    SET is_visible = NOT is_visible,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
    RETURNING *
    `,
    [reviewId]
  );

  if (result.rows.length === 0) {
    throw new Error("Review not found");
  }

  return result.rows[0];
}

/**
 * ADMIN: Flag/unflag review
 */
export async function adminToggleFlag(
  reviewId: string,
  adminId: string,
  reason?: string
): Promise<Review> {
  // Check current flag status
  const current = await pool.query(
    `SELECT is_flagged FROM reviews WHERE id = $1`,
    [reviewId]
  );

  if (current.rows.length === 0) {
    throw new Error("Review not found");
  }

  const isFlagged = current.rows[0].is_flagged;

  // Toggle flag - ✅ FIXED: Added ::uuid casting
  const result = await pool.query<Review>(
    `
    UPDATE reviews
    SET 
      is_flagged = NOT is_flagged,
      flagged_reason = $2,
      flagged_at = CASE WHEN NOT is_flagged THEN CURRENT_TIMESTAMP ELSE NULL END,
      flagged_by = CASE WHEN NOT is_flagged THEN $3::uuid ELSE NULL END,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
    RETURNING *
    `,
    [reviewId, isFlagged ? null : reason, isFlagged ? null : adminId]
  );

  return result.rows[0];
}

/**
 * ADMIN: Delete review
 */
export async function adminDeleteReview(reviewId: string): Promise<boolean> {
  const result = await pool.query(
    `DELETE FROM reviews WHERE id = $1 RETURNING id`,
    [reviewId]
  );

  return result.rows.length > 0;
}

/**
 * ADMIN: Get overall review statistics
 */
export async function adminGetReviewStats(): Promise<{
  total: number;
  average_rating: number;
  five_star: number;
  four_star: number;
  three_star: number;
  two_star: number;
  one_star: number;
}> {
  const result = await pool.query(
    `
    SELECT
      COUNT(*)::int as total,
      COALESCE(ROUND(AVG(rating)::numeric, 1), 0)::float as average_rating,
      COUNT(*) FILTER (WHERE rating = 5)::int as five_star,
      COUNT(*) FILTER (WHERE rating = 4)::int as four_star,
      COUNT(*) FILTER (WHERE rating = 3)::int as three_star,
      COUNT(*) FILTER (WHERE rating = 2)::int as two_star,
      COUNT(*) FILTER (WHERE rating = 1)::int as one_star
    FROM reviews
    `
  );

  return result.rows[0];
}