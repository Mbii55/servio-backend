// src/modules/favorites/favorite.repository.ts

import pool from "../../config/database";
import { Favorite, FavoriteService } from "./favorite.types";

export async function listFavoritesForUser(userId: string): Promise<FavoriteService[]> {
  const sql = `
    SELECT
      f.id AS favorite_id,
      f.created_at AS favorited_at,

      s.id,
      s.provider_id,
      s.category_id,
      s.title,
      s.description,
      s.base_price,
      s.duration_minutes,
      s.images,
      s.is_active,
      s.created_at,
      s.updated_at,

      c.name AS category_name,
      c.slug AS category_slug,

      u.first_name AS provider_first_name,
      u.last_name AS provider_last_name,
      u.profile_image AS provider_profile_image,

      bp.business_name,
      bp.business_logo,
      bp.city AS business_city,
      bp.country AS business_country

    FROM favorites f
    JOIN services s ON s.id = f.service_id
    LEFT JOIN categories c ON c.id = s.category_id
    LEFT JOIN users u ON u.id = s.provider_id
    LEFT JOIN business_profiles bp ON bp.user_id = s.provider_id
    WHERE f.user_id = $1
      AND s.is_active = true
    ORDER BY f.created_at DESC
  `;
  const { rows } = await pool.query(sql, [userId]);
  return rows;
}

export async function isServiceFavorited(userId: string, serviceId: string): Promise<boolean> {
  const { rowCount } = await pool.query(
    `SELECT 1 FROM favorites WHERE user_id = $1 AND service_id = $2 LIMIT 1`,
    [userId, serviceId]
  );
  return (rowCount ?? 0) > 0;
}

/**
 * Idempotent “add”: if already favorited, returns the existing row (without changing created_at).
 */
export async function addFavorite(userId: string, serviceId: string): Promise<Favorite> {
  const sql = `
    INSERT INTO favorites (user_id, service_id)
    VALUES ($1, $2)
    ON CONFLICT (user_id, service_id)
    DO UPDATE SET user_id = EXCLUDED.user_id
    RETURNING *
  `;
  const { rows } = await pool.query(sql, [userId, serviceId]);
  return rows[0];
}

export async function removeFavorite(userId: string, serviceId: string): Promise<boolean> {
  const { rowCount } = await pool.query(
    `DELETE FROM favorites WHERE user_id = $1 AND service_id = $2`,
    [userId, serviceId]
  );
  return (rowCount ?? 0) > 0;
}
