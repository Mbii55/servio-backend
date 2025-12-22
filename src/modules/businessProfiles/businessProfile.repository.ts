// src/modules/businessProfiles/businessProfile.repository.ts
import pool from "../../config/database";

export async function getCommissionRateForProvider(
  providerId: string
): Promise<number> {
  const result = await pool.query<{ commission_rate: string | null }>(
    `
    SELECT commission_rate
    FROM business_profiles
    WHERE user_id = $1
    LIMIT 1
    `,
    [providerId]
  );

  const row = result.rows[0];
  if (!row || row.commission_rate == null) {
    return 15.0; // default 15%
  }

  return Number(row.commission_rate);
}
