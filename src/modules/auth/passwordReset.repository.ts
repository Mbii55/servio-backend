import pool from "../../config/database";

export async function createPasswordResetToken(params: {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}) {
  const { userId, tokenHash, expiresAt } = params;

  await pool.query(
    `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [userId, tokenHash, expiresAt]
  );
}

export async function findValidPasswordResetToken(params: {
  userId: string;
  tokenHash: string;
}) {
  const { userId, tokenHash } = params;

  const { rows } = await pool.query(
    `SELECT id, user_id, token_hash, expires_at, used_at, created_at
     FROM password_reset_tokens
     WHERE user_id = $1
       AND token_hash = $2
       AND used_at IS NULL
       AND expires_at > NOW()
     ORDER BY created_at DESC
     LIMIT 1`,
    [userId, tokenHash]
  );

  return rows[0] ?? null;
}

export async function markPasswordResetTokenUsed(tokenId: string) {
  await pool.query(
    `UPDATE password_reset_tokens
     SET used_at = NOW()
     WHERE id = $1`,
    [tokenId]
  );
}

// Optional: cleanup old tokens (can be cron later)
export async function deleteExpiredTokensForUser(userId: string) {
  await pool.query(
    `DELETE FROM password_reset_tokens
     WHERE user_id = $1
       AND (expires_at < NOW() OR used_at IS NOT NULL)`,
    [userId]
  );
}
