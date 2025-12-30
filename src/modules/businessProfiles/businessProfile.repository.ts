// src/modules/businessProfiles/businessProfile.repository.ts
import pool from "../../config/database";

/* ======================================================
   TYPES
====================================================== */

export interface CreateBusinessProfileInput {
  userId: string;
  businessName: string;
  businessDescription?: string;
  businessLogo?: string;
}

export interface UpdateBusinessProfileInput {
  businessName?: string;
  businessDescription?: string;
  businessLogo?: string;
}

export interface BusinessProfile {
  id: string;
  user_id: string;
  business_name: string;
  business_description: string | null;
  business_logo: string | null;
  business_email: string | null;
  business_phone: string | null;
  street_address: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string;
  latitude: string | null;
  longitude: string | null;
  tax_id: string | null;
  commission_rate: string;
  is_active: boolean;
  verification_status: "pending" | "approved" | "rejected" | "resubmitted";
  verified_at: string | null;
  verified_by: string | null;
  rejection_reason: string | null;
  rejected_at: string | null;

  created_at: string;
  updated_at: string;
}


/* ======================================================
   CREATE
====================================================== */

export async function createBusinessProfile(
  input: CreateBusinessProfileInput
): Promise<BusinessProfile> {
  const result = await pool.query(
    `
    INSERT INTO business_profiles 
      (user_id, business_name, business_description, business_logo, country, commission_rate, is_active) 
    VALUES ($1, $2, $3, $4, $5, $6, $7) 
    RETURNING *
    `,
    [
      input.userId,
      input.businessName,
      input.businessDescription || null,
      input.businessLogo || null,
      "Qatar",
      15.0, // Default commission rate
      true,
    ]
  );

  return result.rows[0];
}

/* ======================================================
   READ (PROVIDER)
====================================================== */

export async function getBusinessProfileByUserId(
  userId: string
): Promise<BusinessProfile | null> {
  const result = await pool.query(
    `SELECT * FROM business_profiles WHERE user_id = $1`,
    [userId]
  );

  return result.rows[0] || null;
}

/* ======================================================
   UPDATE (PROVIDER)
====================================================== */

export async function updateBusinessProfile(
  userId: string,
  updates: UpdateBusinessProfileInput
): Promise<BusinessProfile | null> {
  const fields: string[] = [];
  const values: any[] = [];
  let paramCount = 1;

  if (updates.businessName !== undefined) {
    fields.push(`business_name = $${paramCount++}`);
    values.push(updates.businessName);
  }

  if (updates.businessDescription !== undefined) {
    fields.push(`business_description = $${paramCount++}`);
    values.push(updates.businessDescription);
  }

  if (updates.businessLogo !== undefined) {
    fields.push(`business_logo = $${paramCount++}`);
    values.push(updates.businessLogo || null);
  }

  if (fields.length === 0) {
    return getBusinessProfileByUserId(userId);
  }

  values.push(userId);

  const result = await pool.query(
    `
    UPDATE business_profiles 
    SET ${fields.join(", ")}, updated_at = CURRENT_TIMESTAMP 
    WHERE user_id = $${paramCount}
    RETURNING *
    `,
    values
  );

  return result.rows[0] || null;
}

/* ======================================================
   COMMISSION MANAGEMENT
====================================================== */

/**
 * Get commission rate for a provider by their user_id
 * Used during booking creation to calculate commission
 */
export async function getCommissionRateForProvider(
  providerId: string
): Promise<number> {
  const result = await pool.query(
    `SELECT commission_rate FROM business_profiles WHERE user_id = $1`,
    [providerId]
  );

  if (result.rows.length === 0) {
    return 15.0; // Default fallback rate
  }

  return parseFloat(result.rows[0].commission_rate);
}

/**
 * Get commission rate by business_profile_id
 * Used by admin to view current rate
 */
export async function getCommissionRateByBusinessProfileId(
  businessProfileId: string
): Promise<number | null> {
  const result = await pool.query(
    `SELECT commission_rate FROM business_profiles WHERE id = $1`,
    [businessProfileId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return parseFloat(result.rows[0].commission_rate);
}

/**
 * ✅ NEW: Admin update commission rate for a specific provider
 * @param businessProfileId - The business profile ID
 * @param commissionRate - New commission rate (0-100)
 */
export async function adminUpdateCommissionRate(
  businessProfileId: string,
  commissionRate: number
): Promise<void> {
  await pool.query(
    `
    UPDATE business_profiles
    SET commission_rate = $1, updated_at = CURRENT_TIMESTAMP
    WHERE id = $2
    `,
    [commissionRate, businessProfileId]
  );
}

/* ======================================================
   ADMIN – PROVIDER REVIEW
====================================================== */

export interface AdminProviderProfileRow {
  id: string;
  business_name: string;
  business_logo: string | null;
  is_active: boolean;
  commission_rate: string;
  city: string | null;
  country: string;
  created_at: string;
  user_id: string;
  email: string;
  first_name: string;
  last_name: string;
}

/* ======================================================
   Admin: list all provider business profiles
   (with verification status for admin UI)
====================================================== */
export async function adminListProviderProfiles(): Promise<
  AdminProviderProfileRow[]
> {
  const result = await pool.query(
    `
    SELECT
      bp.id,
      bp.business_name,
      bp.business_logo,
      bp.is_active,
      bp.commission_rate,
      bp.city,
      bp.country,
      bp.created_at,

      -- ✅ verification fields
      bp.verification_status,
      bp.verified_at,
      bp.rejected_at,

      -- user info
      u.id AS user_id,
      u.display_id,
      u.email,
      u.first_name,
      u.last_name
    FROM business_profiles bp
    JOIN users u ON u.id = bp.user_id
    WHERE u.role = 'provider'
    ORDER BY bp.created_at DESC
    `
  );

  return result.rows;
}


/* Admin: activate / deactivate provider business */
export async function adminSetBusinessActive(
  businessProfileId: string,
  isActive: boolean
): Promise<void> {
  await pool.query(
    `
    UPDATE business_profiles
    SET is_active = $1, updated_at = CURRENT_TIMESTAMP
    WHERE id = $2
    `,
    [isActive, businessProfileId]
  );
}

/**
 * Get full provider profile with all business details
 * Used by admin to view complete provider information
 */
export async function adminGetFullProviderProfile(
  businessProfileId: string
): Promise<any | null> {
  const result = await pool.query(
    `
    SELECT
      bp.id,
      bp.user_id,
      bp.business_name,
      bp.business_description,
      bp.business_logo,
      bp.business_email,
      bp.business_phone,
      bp.street_address,
      bp.city,
      bp.state,
      bp.postal_code,
      bp.country,
      bp.latitude,
      bp.longitude,
      bp.tax_id,
      bp.commission_rate,
      bp.is_active,
      bp.created_at,
      bp.updated_at,
      
      u.email,
      u.display_id,
      u.first_name,
      u.last_name,
      u.phone,
      u.profile_image,
      u.status,
      
      -- Count of services
      (SELECT COUNT(*)::INTEGER FROM services WHERE provider_id = bp.user_id AND is_active = true) as active_services_count,
      
      -- Count of total bookings
      (SELECT COUNT(*)::INTEGER FROM bookings WHERE provider_id = bp.user_id) as total_bookings,
      
      -- Count of completed bookings
      (SELECT COUNT(*)::INTEGER FROM bookings WHERE provider_id = bp.user_id AND status = 'completed') as completed_bookings,
      
      -- Total earnings
      (SELECT COALESCE(SUM(provider_earnings), 0) FROM bookings WHERE provider_id = bp.user_id AND status = 'completed') as total_earnings
      
    FROM business_profiles bp
    JOIN users u ON u.id = bp.user_id
    WHERE bp.id = $1
    `,
    [businessProfileId]
  );

  return result.rows[0] || null;
}