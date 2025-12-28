import pool from "../../config/database";

export type AdminDashboardStats = {
  total_users: number;
  active_services: number;
  total_bookings: number;
  revenue: number; // platform revenue (sum commission_amount)
};

export async function getAdminDashboardStats(): Promise<AdminDashboardStats> {
  // Single query with subselects (fast + one DB roundtrip)
  const q = `
    SELECT
      -- Total users (excluding admins is optional; choose what you want)
      (SELECT COUNT(*)::int
       FROM users u
       WHERE u.role IN ('customer','provider')
      ) AS total_users,

      -- Active services
      (SELECT COUNT(*)::int
       FROM services s
       WHERE s.is_active = true
      ) AS active_services,

      -- Total bookings
      (SELECT COUNT(*)::int
       FROM bookings b
      ) AS total_bookings,

        -- Platform revenue = sum of commission on completed+paid
        (SELECT COALESCE(SUM(b.commission_amount), 0)
        FROM bookings b
        WHERE b.status = 'completed' AND b.payment_status = 'paid'
        ) AS revenue
  `;

  const res = await pool.query(q);
  const row = res.rows[0];

  return {
    total_users: Number(row.total_users || 0),
    active_services: Number(row.active_services || 0),
    total_bookings: Number(row.total_bookings || 0),
    revenue: Number(row.revenue || 0),
  };
}
