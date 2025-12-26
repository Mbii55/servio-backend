// src/modules/favorites/favorite.repository.ts

import pool from "../../config/database";
import { Favorite, FavoriteService, FavoriteProvider, FavoriteItem, FavoriteType } from "./favorite.types";

export async function listFavoritesForUser(
  userId: string,
  type?: FavoriteType
): Promise<FavoriteItem[]> {
  // Build WHERE clause based on type filter
  let typeFilter = '';
  if (type === 'service') {
    typeFilter = "AND f.favorite_type = 'service'";
  } else if (type === 'provider') {
    typeFilter = "AND f.favorite_type = 'provider'";
  }

  const sql = `
    SELECT
      f.id AS favorite_id,
      f.created_at AS favorited_at,
      f.favorite_type,

      -- Service fields (will be NULL for providers)
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

      -- Provider fields for services
      u_service.first_name AS provider_first_name,
      u_service.last_name AS provider_last_name,
      u_service.profile_image AS provider_profile_image,

      bp_service.business_name,
      bp_service.business_logo,
      bp_service.city AS business_city,
      bp_service.country AS business_country,

      -- Provider favorite fields (will be NULL for services)
      u_provider.id AS provider_id,
      u_provider.email AS provider_email,
      u_provider.first_name AS provider_first_name_direct,
      u_provider.last_name AS provider_last_name_direct,
      u_provider.phone AS provider_phone,
      u_provider.profile_image AS provider_profile_image_direct,
      u_provider.status AS provider_status,

      bp_provider.id AS provider_business_id,
      bp_provider.business_name AS provider_business_name,
      bp_provider.business_description AS provider_business_description,
      bp_provider.business_logo AS provider_business_logo,
      bp_provider.business_email AS provider_business_email,
      bp_provider.business_phone AS provider_business_phone,
      bp_provider.city AS provider_city,
      bp_provider.country AS provider_country,

      (
        SELECT COUNT(*)::int
        FROM services srv
        WHERE srv.provider_id = u_provider.id AND srv.is_active = true
      ) AS service_count

    FROM favorites f
    -- Service joins
    LEFT JOIN services s ON s.id = f.service_id AND f.favorite_type = 'service'
    LEFT JOIN categories c ON c.id = s.category_id
    LEFT JOIN users u_service ON u_service.id = s.provider_id
    LEFT JOIN business_profiles bp_service ON bp_service.user_id = s.provider_id
    -- Provider joins
    LEFT JOIN users u_provider ON u_provider.id = f.provider_id AND f.favorite_type = 'provider'
    LEFT JOIN business_profiles bp_provider ON bp_provider.user_id = u_provider.id
    
    WHERE f.user_id = $1
      ${typeFilter}
      AND (
        (f.favorite_type = 'service' AND s.is_active = true) OR
        (f.favorite_type = 'provider' AND u_provider.status = 'active')
      )
    ORDER BY f.created_at DESC
  `;

  const { rows } = await pool.query(sql, [userId]);
  return rows;
}

export async function isServiceFavorited(userId: string, serviceId: string): Promise<boolean> {
  const { rowCount } = await pool.query(
    `SELECT 1 FROM favorites WHERE user_id = $1 AND service_id = $2 AND favorite_type = 'service' LIMIT 1`,
    [userId, serviceId]
  );
  return (rowCount ?? 0) > 0;
}

export async function isProviderFavorited(userId: string, providerId: string): Promise<boolean> {
  const { rowCount } = await pool.query(
    `SELECT 1 FROM favorites WHERE user_id = $1 AND provider_id = $2 AND favorite_type = 'provider' LIMIT 1`,
    [userId, providerId]
  );
  return (rowCount ?? 0) > 0;
}

export async function addFavorite(userId: string, serviceId: string): Promise<Favorite> {
  const sql = `
    INSERT INTO favorites (user_id, service_id, favorite_type)
    VALUES ($1, $2, 'service')
    ON CONFLICT (user_id, service_id)
    WHERE favorite_type = 'service'
    DO UPDATE SET user_id = EXCLUDED.user_id
    RETURNING *
  `;
  const { rows } = await pool.query(sql, [userId, serviceId]);
  return rows[0];
}

export async function addProviderFavorite(userId: string, providerId: string): Promise<Favorite> {
  const sql = `
    INSERT INTO favorites (user_id, provider_id, favorite_type)
    VALUES ($1, $2, 'provider')
    ON CONFLICT (user_id, provider_id)
    WHERE favorite_type = 'provider'
    DO UPDATE SET user_id = EXCLUDED.user_id
    RETURNING *
  `;
  const { rows } = await pool.query(sql, [userId, providerId]);
  return rows[0];
}

export async function removeFavorite(userId: string, serviceId: string): Promise<boolean> {
  const { rowCount } = await pool.query(
    `DELETE FROM favorites WHERE user_id = $1 AND service_id = $2 AND favorite_type = 'service'`,
    [userId, serviceId]
  );
  return (rowCount ?? 0) > 0;
}

export async function removeProviderFavorite(userId: string, providerId: string): Promise<boolean> {
  const { rowCount } = await pool.query(
    `DELETE FROM favorites WHERE user_id = $1 AND provider_id = $2 AND favorite_type = 'provider'`,
    [userId, providerId]
  );
  return (rowCount ?? 0) > 0;
}