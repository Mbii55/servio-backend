import pool from "../../config/database";

export async function createNotification(params: {
  user_id: string;
  type: string;
  title: string;
  message: string;
  data?: any;
}) {
  const { user_id, type, title, message, data } = params;

  const result = await pool.query(
    `
    INSERT INTO notifications (user_id, type, title, message, data, is_read)
    VALUES ($1, $2, $3, $4, $5, false)
    RETURNING *
    `,
    [user_id, type, title, message, data ?? null]
  );

  return result.rows[0];
}

export async function listMyNotifications(userId: string, limit = 30) {
  const result = await pool.query(
    `
    SELECT *
    FROM notifications
    WHERE user_id = $1
    ORDER BY created_at DESC
    LIMIT $2
    `,
    [userId, limit]
  );
  return result.rows;
}

export async function getUnreadCount(userId: string) {
  const result = await pool.query(
    `
    SELECT COUNT(*)::int AS count
    FROM notifications
    WHERE user_id = $1 AND is_read = false
    `,
    [userId]
  );
  return result.rows[0]?.count ?? 0;
}

export async function markAllRead(userId: string) {
  await pool.query(
    `
    UPDATE notifications
    SET is_read = true
    WHERE user_id = $1 AND is_read = false
    `,
    [userId]
  );
  return true;
}

export async function markOneRead(userId: string, notificationId: string) {
  const result = await pool.query(
    `
    UPDATE notifications
    SET is_read = true
    WHERE id = $1 AND user_id = $2
    RETURNING *
    `,
    [notificationId, userId]
  );
  return result.rows[0] ?? null;
}
