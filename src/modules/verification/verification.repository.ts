// src/modules/verification/verification.repository.ts
import pool from "../../config/database";
import {
  VerificationDocument,
  VerificationHistory,
  VerificationStatus,
  DocumentType,
  UploadDocumentInput,
  BusinessProfileWithVerification,
} from "./verification.types";

/**
 * PROVIDER: Upload verification document
 */
export async function uploadVerificationDocument(
  input: UploadDocumentInput
): Promise<VerificationDocument> {
  const result = await pool.query<VerificationDocument>(
    `
    INSERT INTO verification_documents (
      business_profile_id,
      document_type,
      document_url,
      document_name,
      file_size
    )
    VALUES ($1, $2, $3, $4, $5)
    ON CONFLICT (business_profile_id, document_type) 
    DO UPDATE SET
      document_url = EXCLUDED.document_url,
      document_name = EXCLUDED.document_name,
      file_size = EXCLUDED.file_size,
      uploaded_at = CURRENT_TIMESTAMP,
      is_verified = false,
      verified_at = NULL,
      verified_by = NULL,
      rejection_reason = NULL,
      updated_at = CURRENT_TIMESTAMP
    RETURNING *
    `,
    [
      input.business_profile_id,
      input.document_type,
      input.document_url,
      input.document_name || null,
      input.file_size || null,
    ]
  );

  return result.rows[0];
}

/**
 * PROVIDER: Get verification status for their business profile
 */
export async function getProviderVerificationStatus(
  userId: string
): Promise<{
  verification_status: VerificationStatus;
  documents: VerificationDocument[];
  rejection_reason: string | null;
} | null> {
  const result = await pool.query(
    `
    SELECT
      bp.verification_status,
      bp.rejection_reason,
      COALESCE(
        json_agg(
          json_build_object(
            'id', vd.id,
            'document_type', vd.document_type,
            'document_url', vd.document_url,
            'document_name', vd.document_name,
            'file_size', vd.file_size,
            'uploaded_at', vd.uploaded_at,
            'is_verified', vd.is_verified,
            'verified_at', vd.verified_at,
            'rejection_reason', vd.rejection_reason
          )
          ORDER BY vd.created_at DESC
        ) FILTER (WHERE vd.id IS NOT NULL),
        '[]'
      ) as documents
    FROM business_profiles bp
    LEFT JOIN verification_documents vd ON vd.business_profile_id = bp.id
    WHERE bp.user_id = $1
    GROUP BY bp.id, bp.verification_status, bp.rejection_reason
    `,
    [userId]
  );

  if (result.rows.length === 0) return null;

  return {
    verification_status: result.rows[0].verification_status,
    documents: result.rows[0].documents || [],
    rejection_reason: result.rows[0].rejection_reason,
  };
}

/**
 * ADMIN: Get all pending verifications
 */
export async function adminGetPendingVerifications(): Promise<
  BusinessProfileWithVerification[]
> {
  const result = await pool.query(
    `
    SELECT
      bp.id,
      bp.user_id,
      bp.business_name,
      bp.business_logo,
      bp.business_email,
      bp.business_phone,
      bp.verification_status,
      bp.verified_at,
      bp.verified_by,
      bp.rejection_reason,
      bp.rejected_at,
      bp.created_at,
      
      u.email as user_email,
      u.first_name as user_first_name,
      u.last_name as user_last_name,
      u.display_id as user_display_id,
      
      COALESCE(
        json_agg(
          json_build_object(
            'id', vd.id,
            'document_type', vd.document_type,
            'document_url', vd.document_url,
            'document_name', vd.document_name,
            'file_size', vd.file_size,
            'uploaded_at', vd.uploaded_at,
            'is_verified', vd.is_verified,
            'verified_at', vd.verified_at,
            'verified_by', vd.verified_by,
            'rejection_reason', vd.rejection_reason
          )
          ORDER BY vd.document_type
        ) FILTER (WHERE vd.id IS NOT NULL),
        '[]'
      ) as documents
      
    FROM business_profiles bp
    JOIN users u ON u.id = bp.user_id
    LEFT JOIN verification_documents vd ON vd.business_profile_id = bp.id
    WHERE bp.verification_status = 'pending'
    GROUP BY bp.id, u.email, u.first_name, u.last_name, u.display_id
    ORDER BY bp.created_at ASC
    `
  );

  return result.rows;
}

/**
 * ADMIN: Get all verifications (with filtering)
 */
export async function adminGetAllVerifications(params?: {
  status?: VerificationStatus;
  search?: string;
}): Promise<BusinessProfileWithVerification[]> {
  const { status, search } = params || {};

  let query = `
    SELECT
      bp.id,
      bp.user_id,
      bp.business_name,
      bp.business_logo,
      bp.business_email,
      bp.business_phone,
      bp.verification_status,
      bp.verified_at,
      bp.verified_by,
      bp.rejection_reason,
      bp.rejected_at,
      bp.created_at,
      
      u.email as user_email,
      u.first_name as user_first_name,
      u.last_name as user_last_name,
      u.display_id as user_display_id,
      
      COALESCE(
        json_agg(
          json_build_object(
            'id', vd.id,
            'document_type', vd.document_type,
            'document_url', vd.document_url,
            'document_name', vd.document_name,
            'file_size', vd.file_size,
            'uploaded_at', vd.uploaded_at,
            'is_verified', vd.is_verified,
            'verified_at', vd.verified_at,
            'verified_by', vd.verified_by,
            'rejection_reason', vd.rejection_reason
          )
          ORDER BY vd.document_type
        ) FILTER (WHERE vd.id IS NOT NULL),
        '[]'
      ) as documents
      
    FROM business_profiles bp
    JOIN users u ON u.id = bp.user_id
    LEFT JOIN verification_documents vd ON vd.business_profile_id = bp.id
    WHERE 1=1
  `;

  const values: any[] = [];
  let paramIndex = 1;

  if (status) {
    query += ` AND bp.verification_status = $${paramIndex}`;
    values.push(status);
    paramIndex++;
  }

  if (search) {
    query += ` AND (
      bp.business_name ILIKE $${paramIndex} OR
      u.email ILIKE $${paramIndex} OR
      u.first_name ILIKE $${paramIndex} OR
      u.last_name ILIKE $${paramIndex} OR
      u.display_id ILIKE $${paramIndex}
    )`;
    values.push(`%${search}%`);
    paramIndex++;
  }

  query += `
    GROUP BY bp.id, u.email, u.first_name, u.last_name, u.display_id
    ORDER BY bp.created_at DESC
  `;

  const result = await pool.query(query, values);
  return result.rows;
}

/**
 * ADMIN: Get single verification details
 */
export async function adminGetVerificationDetails(
  businessProfileId: string
): Promise<BusinessProfileWithVerification | null> {
  const result = await pool.query(
    `
    SELECT
      bp.id,
      bp.user_id,
      bp.business_name,
      bp.business_logo,
      bp.business_email,
      bp.business_phone,
      bp.verification_status,
      bp.verified_at,
      bp.verified_by,
      bp.rejection_reason,
      bp.rejected_at,
      bp.created_at,
      
      u.email as user_email,
      u.first_name as user_first_name,
      u.last_name as user_last_name,
      u.display_id as user_display_id,
      
      COALESCE(
        json_agg(
          json_build_object(
            'id', vd.id,
            'document_type', vd.document_type,
            'document_url', vd.document_url,
            'document_name', vd.document_name,
            'file_size', vd.file_size,
            'uploaded_at', vd.uploaded_at,
            'is_verified', vd.is_verified,
            'verified_at', vd.verified_at,
            'verified_by', vd.verified_by,
            'rejection_reason', vd.rejection_reason
          )
          ORDER BY vd.document_type
        ) FILTER (WHERE vd.id IS NOT NULL),
        '[]'
      ) as documents
      
    FROM business_profiles bp
    JOIN users u ON u.id = bp.user_id
    LEFT JOIN verification_documents vd ON vd.business_profile_id = bp.id
    WHERE bp.id = $1
    GROUP BY bp.id, u.email, u.first_name, u.last_name, u.display_id
    `,
    [businessProfileId]
  );

  return result.rows[0] || null;
}

/**
 * ADMIN: Verify a single document
 */
export async function adminVerifyDocument(
  documentId: string,
  adminId: string,
  isVerified: boolean,
  rejectionReason?: string
): Promise<VerificationDocument> {
  const result = await pool.query<VerificationDocument>(
    `
    UPDATE verification_documents
    SET
      is_verified = $1,
      verified_at = CASE WHEN $1 = true THEN CURRENT_TIMESTAMP ELSE NULL END,
      verified_by = CASE WHEN $1 = true THEN $2 ELSE NULL END,
      rejection_reason = $3,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $4
    RETURNING *
    `,
    [isVerified, adminId, rejectionReason || null, documentId]
  );

  if (result.rows.length === 0) {
    throw new Error("Document not found");
  }

  return result.rows[0];
}

/**
 * ADMIN: Update business profile verification status
 */
export async function adminUpdateVerificationStatus(
  businessProfileId: string,
  adminId: string,
  newStatus: VerificationStatus,
  rejectionReason?: string
): Promise<void> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // Get current status for history
    const currentResult = await client.query(
      `SELECT verification_status FROM business_profiles WHERE id = $1`,
      [businessProfileId]
    );

    const previousStatus = currentResult.rows[0]?.verification_status || null;

    // Update business profile status
    await client.query(
      `
      UPDATE business_profiles
      SET
        verification_status = $1,
        verified_at = CASE WHEN $1 = 'approved' THEN CURRENT_TIMESTAMP ELSE NULL END,
        verified_by = CASE WHEN $1 = 'approved' THEN $2 ELSE NULL END,
        rejection_reason = $3,
        rejected_at = CASE WHEN $1 = 'rejected' THEN CURRENT_TIMESTAMP ELSE NULL END,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $4
      `,
      [newStatus, adminId, rejectionReason || null, businessProfileId]
    );

    // Add to history
    await client.query(
      `
      INSERT INTO verification_history (
        business_profile_id,
        previous_status,
        new_status,
        changed_by,
        reason
      )
      VALUES ($1, $2, $3, $4, $5)
      `,
      [businessProfileId, previousStatus, newStatus, adminId, rejectionReason || null]
    );

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

/**
 * ADMIN: Get verification history for a business profile
 */
export async function getVerificationHistory(
  businessProfileId: string
): Promise<VerificationHistory[]> {
  const result = await pool.query<VerificationHistory>(
    `
    SELECT
      vh.*,
      u.first_name || ' ' || u.last_name as changed_by_name
    FROM verification_history vh
    JOIN users u ON u.id = vh.changed_by
    WHERE vh.business_profile_id = $1
    ORDER BY vh.created_at DESC
    `,
    [businessProfileId]
  );

  return result.rows;
}

/**
 * ADMIN: Get verification statistics
 */
export async function getVerificationStatistics(): Promise<{
  pending: number;
  approved: number;
  rejected: number;
  resubmitted: number;
  total: number;
}> {
  const result = await pool.query(
    `
    SELECT
      COUNT(*) FILTER (WHERE verification_status = 'pending') as pending,
      COUNT(*) FILTER (WHERE verification_status = 'approved') as approved,
      COUNT(*) FILTER (WHERE verification_status = 'rejected') as rejected,
      COUNT(*) FILTER (WHERE verification_status = 'resubmitted') as resubmitted,
      COUNT(*) as total
    FROM business_profiles
    `
  );

  return {
    pending: parseInt(result.rows[0].pending),
    approved: parseInt(result.rows[0].approved),
    rejected: parseInt(result.rows[0].rejected),
    resubmitted: parseInt(result.rows[0].resubmitted),
    total: parseInt(result.rows[0].total),
  };
}

/**
 * PROVIDER: Delete their own document (before verification)
 */
export async function deleteVerificationDocument(
  documentId: string,
  userId: string
): Promise<boolean> {
  const result = await pool.query(
    `
    DELETE FROM verification_documents vd
    USING business_profiles bp
    WHERE vd.id = $1
      AND vd.business_profile_id = bp.id
      AND bp.user_id = $2
      AND vd.is_verified = false
    RETURNING vd.id
    `,
    [documentId, userId]
  );

  return result.rows.length > 0;
}