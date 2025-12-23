// src/modules/earnings/earnings.repository.ts
import pool from "../../config/database";

export interface EarningsSummary {
  total_earnings: string;
  pending_earnings: string;
  paid_earnings: string;
  current_month_earnings: string;
  last_month_earnings: string;
  total_bookings: number;
  completed_bookings: number;
  average_earning_per_booking: string;
}

export interface EarningsTransaction {
  id: string;
  booking_id: string;
  booking_number: string;
  service_id: string;
  service_title: string;
  scheduled_date: string;
  completed_at: string | null;
  subtotal: string;
  commission_amount: string;
  provider_earnings: string;
  payment_method: string;
  payment_status: string;
  status: string;
}

export interface MonthlyEarnings {
  month: string;
  year: number;
  total_earnings: string;
  completed_bookings: number;
}

export async function getEarningsSummary(providerId: string): Promise<EarningsSummary> {
  const result = await pool.query<EarningsSummary>(
    `
    SELECT
      COALESCE(SUM(CASE WHEN status = 'completed' THEN provider_earnings ELSE 0 END), 0) as total_earnings,
      COALESCE(SUM(CASE WHEN status IN ('pending', 'accepted', 'in_progress') THEN provider_earnings ELSE 0 END), 0) as pending_earnings,
      COALESCE(SUM(CASE WHEN status = 'completed' AND payment_status = 'paid' THEN provider_earnings ELSE 0 END), 0) as paid_earnings,
      COALESCE(SUM(CASE WHEN status = 'completed' AND DATE_TRUNC('month', completed_at) = DATE_TRUNC('month', CURRENT_DATE) THEN provider_earnings ELSE 0 END), 0) as current_month_earnings,
      COALESCE(SUM(CASE WHEN status = 'completed' AND DATE_TRUNC('month', completed_at) = DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month') THEN provider_earnings ELSE 0 END), 0) as last_month_earnings,
      COUNT(*)::INTEGER as total_bookings,
      COUNT(CASE WHEN status = 'completed' THEN 1 END)::INTEGER as completed_bookings,
      COALESCE(AVG(CASE WHEN status = 'completed' THEN provider_earnings END), 0) as average_earning_per_booking
    FROM bookings
    WHERE provider_id = $1
    `,
    [providerId]
  );

  return result.rows[0];
}

export async function getEarningsTransactions(providerId: string): Promise<EarningsTransaction[]> {
  const result = await pool.query<EarningsTransaction>(
    `
    SELECT
      b.id,
      b.id as booking_id,
      b.booking_number,
      b.service_id,
      s.title as service_title,
      b.scheduled_date,
      b.completed_at,
      b.subtotal,
      b.commission_amount,
      b.provider_earnings,
      b.payment_method,
      b.payment_status,
      b.status
    FROM bookings b
    LEFT JOIN services s ON b.service_id = s.id
    WHERE b.provider_id = $1
    ORDER BY b.created_at DESC
    `,
    [providerId]
  );

  return result.rows;
}

export async function getMonthlyEarnings(providerId: string): Promise<MonthlyEarnings[]> {
  const result = await pool.query<MonthlyEarnings>(
    `
    SELECT
      TO_CHAR(completed_at, 'Month') as month,
      EXTRACT(YEAR FROM completed_at)::INTEGER as year,
      COALESCE(SUM(provider_earnings), 0) as total_earnings,
      COUNT(*)::INTEGER as completed_bookings
    FROM bookings
    WHERE provider_id = $1
      AND status = 'completed'
      AND completed_at IS NOT NULL
      AND completed_at >= CURRENT_DATE - INTERVAL '12 months'
    GROUP BY DATE_TRUNC('month', completed_at), TO_CHAR(completed_at, 'Month'), EXTRACT(YEAR FROM completed_at)
    ORDER BY DATE_TRUNC('month', completed_at) DESC
    LIMIT 12
    `,
    [providerId]
  );

  return result.rows;
}