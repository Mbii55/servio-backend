// src/modules/businessProfiles/businessProfile.repository.ts
import pool from "../../config/database";

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
  created_at: string;
  updated_at: string;
}

export async function createBusinessProfile(
  input: CreateBusinessProfileInput
): Promise<BusinessProfile> {
  const result = await pool.query(
    `INSERT INTO business_profiles 
      (user_id, business_name, business_description, business_logo, country, commission_rate, is_active) 
     VALUES ($1, $2, $3, $4, $5, $6, $7) 
     RETURNING *`,
    [
      input.userId,
      input.businessName,
      input.businessDescription || null,
      input.businessLogo || null,
      'Qatar',
      15.00, // Default commission rate
      true
    ]
  );

  return result.rows[0];
}

export async function getBusinessProfileByUserId(
  userId: string
): Promise<BusinessProfile | null> {
  const result = await pool.query(
    `SELECT * FROM business_profiles WHERE user_id = $1`,
    [userId]
  );

  return result.rows[0] || null;
}

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
    values.push(updates.businessLogo || null); // Allow null to remove logo
  }

  if (fields.length === 0) {
    return getBusinessProfileByUserId(userId);
  }

  values.push(userId);

  const result = await pool.query(
    `UPDATE business_profiles 
     SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP 
     WHERE user_id = $${paramCount} 
     RETURNING *`,
    values
  );

  return result.rows[0] || null;
}

export async function getCommissionRateForProvider(
  providerId: string
): Promise<number> {
  const result = await pool.query(
    `SELECT commission_rate FROM business_profiles WHERE user_id = $1`,
    [providerId]
  );

  if (result.rows.length === 0) {
    return 15.0; // default 15%
  }

  return parseFloat(result.rows[0].commission_rate);
}