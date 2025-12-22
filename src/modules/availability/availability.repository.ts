// src/modules/availability/availability.repository.ts
import pool from "../../config/database";
import {
  ProviderAvailability,
  ProviderBlockedDate,
  CreateAvailabilityInput,
  UpdateAvailabilityInput,
  CreateBlockedDateInput,
  DayOfWeek,
} from "./availability.types";
import { Booking } from "../bookings/booking.types";

export async function listAvailabilityForProvider(
  providerId: string
): Promise<ProviderAvailability[]> {
  const res = await pool.query<ProviderAvailability>(
    `
    SELECT *
    FROM provider_availability
    WHERE provider_id = $1
    ORDER BY
      CASE day_of_week
        WHEN 'monday' THEN 1
        WHEN 'tuesday' THEN 2
        WHEN 'wednesday' THEN 3
        WHEN 'thursday' THEN 4
        WHEN 'friday' THEN 5
        WHEN 'saturday' THEN 6
        WHEN 'sunday' THEN 7
      END,
      start_time ASC
    `,
    [providerId]
  );
  return res.rows;
}

export async function createAvailability(
  providerId: string,
  input: CreateAvailabilityInput
): Promise<ProviderAvailability> {
  const { day_of_week, start_time, end_time, is_available } = input;

  const res = await pool.query<ProviderAvailability>(
    `
    INSERT INTO provider_availability (
      provider_id,
      day_of_week,
      start_time,
      end_time,
      is_available
    )
    VALUES ($1, $2, $3::time, $4::time, COALESCE($5, true))
    RETURNING *
    `,
    [providerId, day_of_week, start_time, end_time, is_available]
  );

  return res.rows[0];
}

export async function updateAvailability(
  id: string,
  providerId: string,
  input: UpdateAvailabilityInput
): Promise<ProviderAvailability | null> {
  const fields: string[] = [];
  const values: any[] = [];
  let index = 1;

  if (input.day_of_week !== undefined) {
    fields.push(`day_of_week = $${index++}`);
    values.push(input.day_of_week);
  }
  if (input.start_time !== undefined) {
    fields.push(`start_time = $${index++}`);
    values.push(input.start_time);
  }
  if (input.end_time !== undefined) {
    fields.push(`end_time = $${index++}`);
    values.push(input.end_time);
  }
  if (input.is_available !== undefined) {
    fields.push(`is_available = $${index++}`);
    values.push(input.is_available);
  }

  if (fields.length === 0) {
    const existing = await getAvailabilityById(id, providerId);
    return existing;
  }

  const query = `
    UPDATE provider_availability
    SET ${fields.join(", ")}
    WHERE id = $${index} AND provider_id = $${index + 1}
    RETURNING *
  `;
  values.push(id, providerId);

  const res = await pool.query<ProviderAvailability>(query, values);
  return res.rows[0] || null;
}

export async function getAvailabilityById(
  id: string,
  providerId: string
): Promise<ProviderAvailability | null> {
  const res = await pool.query<ProviderAvailability>(
    `
    SELECT *
    FROM provider_availability
    WHERE id = $1 AND provider_id = $2
    LIMIT 1
    `,
    [id, providerId]
  );
  return res.rows[0] || null;
}

export async function deleteAvailability(
  id: string,
  providerId: string
): Promise<boolean> {
  const res = await pool.query(
    `
    DELETE FROM provider_availability
    WHERE id = $1 AND provider_id = $2
    `,
    [id, providerId]
  );
  const affected = res.rowCount ?? 0;
  return affected > 0;
}

export async function listBlockedDatesForProvider(
  providerId: string
): Promise<ProviderBlockedDate[]> {
  const res = await pool.query<ProviderBlockedDate>(
    `
    SELECT *
    FROM provider_blocked_dates
    WHERE provider_id = $1
    ORDER BY blocked_date DESC
    `,
    [providerId]
  );
  return res.rows;
}

export async function createBlockedDate(
  providerId: string,
  input: CreateBlockedDateInput
): Promise<ProviderBlockedDate> {
  const { blocked_date, reason } = input;

  const res = await pool.query<ProviderBlockedDate>(
    `
    INSERT INTO provider_blocked_dates (
      provider_id,
      blocked_date,
      reason
    )
    VALUES ($1, $2::date, $3)
    ON CONFLICT (provider_id, blocked_date)
    DO UPDATE SET reason = EXCLUDED.reason
    RETURNING *
    `,
    [providerId, blocked_date, reason ?? null]
  );

  return res.rows[0];
}

export async function deleteBlockedDate(
  id: string,
  providerId: string
): Promise<boolean> {
  const res = await pool.query(
    `
    DELETE FROM provider_blocked_dates
    WHERE id = $1 AND provider_id = $2
    `,
    [id, providerId]
  );
  const affected = res.rowCount ?? 0;
  return affected > 0;
}

// ---- For customer side: compute free slots ----

export async function listAvailabilityForProviderOnDay(
  providerId: string,
  dayOfWeek: DayOfWeek
): Promise<ProviderAvailability[]> {
  const res = await pool.query<ProviderAvailability>(
    `
    SELECT *
    FROM provider_availability
    WHERE provider_id = $1
      AND day_of_week = $2
      AND is_available = true
    ORDER BY start_time ASC
    `,
    [providerId, dayOfWeek]
  );
  return res.rows;
}

export async function isProviderBlockedOnDate(
  providerId: string,
  date: string
): Promise<boolean> {
  const res = await pool.query(
    `
    SELECT 1
    FROM provider_blocked_dates
    WHERE provider_id = $1
      AND blocked_date = $2::date
    LIMIT 1
    `,
    [providerId, date]
  );
  return (res.rowCount ?? 0) > 0;
}

export async function listBookedTimesForDate(
  providerId: string,
  date: string
): Promise<string[]> {
  const res = await pool.query<Pick<Booking, "scheduled_time" | "status">>(
    `
    SELECT scheduled_time, status
    FROM bookings
    WHERE provider_id = $1
      AND scheduled_date = $2::date
      AND status NOT IN ('cancelled', 'rejected')
    `,
    [providerId, date]
  );

  // Return times as "HH:MM"
  return res.rows.map((row) => row.scheduled_time.substring(0, 5));
}
