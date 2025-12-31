// src/modules/services/service.repository.ts
import pool from "../../config/database";
import {
  Service,
  CreateServiceInput,
  UpdateServiceInput,
  ServiceWithProvider,
} from "./service.types";
import { deleteCloudinaryImageByUrl } from "../../utils/cloudinary-delete-by-url";

export async function listActiveServices(params: {
  categoryId?: string;
  providerId?: string;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<ServiceWithProvider[]> {
  const { categoryId, providerId, search, limit = 20, offset = 0 } = params;

  const conditions: string[] = [
    "s.is_active = true",
    "u.status = 'active'",
    "u.role = 'provider'",
    "bp.verification_status = 'approved'", // ✅ Only show services from verified providers
  ];

  const values: any[] = [];
  let index = 1;

  if (categoryId) {
    conditions.push(`s.category_id = $${index++}`);
    values.push(categoryId);
  }

  if (providerId) {
    conditions.push(`s.provider_id = $${index++}`);
    values.push(providerId);
  }

  if (search && search.trim()) {
    conditions.push(`(
      s.title ILIKE $${index} OR 
      s.description ILIKE $${index} OR
      bp.business_name ILIKE $${index} OR
      c.name ILIKE $${index}
    )`);
    values.push(`%${search.trim()}%`);
    index++;
  }

  const whereClause = conditions.join(" AND ");

  const query = `
    SELECT
      s.*,

      -- ✅ category fields (fix "Uncategorized")
      c.name as category_name,
      c.slug as category_slug,

      u.id as provider_id,
      u.first_name as provider_first_name,
      u.last_name as provider_last_name,
      u.phone as provider_phone,
      u.profile_image as provider_profile_image,
      
      bp.business_name,
      bp.business_logo,
      bp.business_description,
      bp.business_email,
      bp.business_phone,
      bp.street_address,
      bp.city,
      bp.state,
      bp.postal_code,
      bp.country,
      bp.latitude,
      bp.longitude
    FROM services s
    -- ✅ added category join
    LEFT JOIN categories c ON c.id = s.category_id
    JOIN users u ON u.id = s.provider_id
    LEFT JOIN business_profiles bp ON bp.user_id = u.id
    WHERE ${whereClause}
    ORDER BY s.created_at DESC
    LIMIT $${index} OFFSET $${index + 1}
  `;

  values.push(limit, offset);

  const result = await pool.query(query, values);

  return result.rows.map((row) => ({
    id: row.id,
    provider_id: row.provider_id,
    category_id: row.category_id,

    // ✅ send to frontend so category shows properly
    category_name: row.category_name ?? null,
    category_slug: row.category_slug ?? null,

    title: row.title,
    description: row.description,
    base_price: row.base_price,
    duration_minutes: row.duration_minutes,
    images: row.images,
    is_active: row.is_active,
    created_at: row.created_at,
    updated_at: row.updated_at,
    provider: {
      id: row.provider_id,
      first_name: row.provider_first_name,
      last_name: row.provider_last_name,
      phone: row.provider_phone,
      profile_image: row.provider_profile_image,
      business_profile: row.business_name
        ? {
            business_name: row.business_name,
            business_logo: row.business_logo,
            business_description: row.business_description,
            business_email: row.business_email,
            business_phone: row.business_phone,
            street_address: row.street_address,
            city: row.city,
            state: row.state,
            postal_code: row.postal_code,
            country: row.country,
            latitude: row.latitude,
            longitude: row.longitude,
          }
        : null,
    },
  }));
}

export async function countActiveServices(params: {
  categoryId?: string;
  providerId?: string;
  search?: string;
}): Promise<number> {
  const { categoryId, providerId, search } = params;

  const conditions: string[] = [
    "s.is_active = true",
    "u.status = 'active'",
    "u.role = 'provider'",
    "bp.verification_status = 'approved'", // ✅ ADDED
  ];
  const values: any[] = [];
  let index = 1;

  if (categoryId) {
    conditions.push(`s.category_id = $${index++}`);
    values.push(categoryId);
  }

  if (providerId) {
    conditions.push(`s.provider_id = $${index++}`);
    values.push(providerId);
  }

  if (search && search.trim()) {
    conditions.push(`(
      s.title ILIKE $${index} OR 
      s.description ILIKE $${index} OR
      bp.business_name ILIKE $${index}
    )`);
    values.push(`%${search.trim()}%`);
    index++;
  }

  const whereClause = conditions.join(" AND ");

  const query = `
    SELECT COUNT(*) as count
    FROM services s
    JOIN users u ON u.id = s.provider_id
    LEFT JOIN business_profiles bp ON bp.user_id = u.id
    WHERE ${whereClause}
  `;

  const result = await pool.query(query, values);
  return parseInt(result.rows[0]?.count || "0", 10);
}

export async function getServiceById(id: string): Promise<ServiceWithProvider | null> {
  const result = await pool.query(
    `
    SELECT
      s.*,

      -- ✅ category fields (fix "Uncategorized")
      c.name as category_name,
      c.slug as category_slug,

      u.id as provider_id,
      u.first_name as provider_first_name,
      u.last_name as provider_last_name,
      u.phone as provider_phone,
      u.profile_image as provider_profile_image,
      
      bp.business_name,
      bp.business_logo,
      bp.business_description,
      bp.business_email,
      bp.business_phone,
      bp.street_address,
      bp.city,
      bp.state,
      bp.postal_code,
      bp.country,
      bp.latitude,
      bp.longitude
    FROM services s
    -- ✅ added category join
    LEFT JOIN categories c ON c.id = s.category_id
    JOIN users u ON u.id = s.provider_id
    LEFT JOIN business_profiles bp ON bp.user_id = u.id
    WHERE s.id = $1
      AND s.is_active = true
      AND u.status = 'active'
      AND bp.verification_status = 'approved'
    LIMIT 1
    `,
    [id]
  );

  if (result.rows.length === 0) return null;

  const row = result.rows[0];

  return {
    id: row.id,
    provider_id: row.provider_id,
    category_id: row.category_id,

    // ✅ send to frontend so category shows properly
    category_name: row.category_name ?? null,
    category_slug: row.category_slug ?? null,

    title: row.title,
    description: row.description,
    base_price: row.base_price,
    duration_minutes: row.duration_minutes,
    images: row.images,
    is_active: row.is_active,
    created_at: row.created_at,
    updated_at: row.updated_at,
    provider: {
      id: row.provider_id,
      first_name: row.provider_first_name,
      last_name: row.provider_last_name,
      phone: row.provider_phone,
      profile_image: row.provider_profile_image,
      business_profile: row.business_name
        ? {
            business_name: row.business_name,
            business_logo: row.business_logo,
            business_description: row.business_description,
            business_email: row.business_email,
            business_phone: row.business_phone,
            street_address: row.street_address,
            city: row.city,
            state: row.state,
            postal_code: row.postal_code,
            country: row.country,
            latitude: row.latitude,
            longitude: row.longitude,
          }
        : null,
    },
  };
}

// ✅ PROVIDER-ONLY: Get their own services (no verification filter)
export async function listServicesByProvider(providerId: string): Promise<Service[]> {
  const result = await pool.query<Service>(
    `SELECT * FROM services WHERE provider_id = $1 ORDER BY created_at DESC`,
    [providerId]
  );
  return result.rows;
}

// Rest of the functions remain unchanged (create, update, deactivate)
export async function createService(
  providerId: string,
  input: CreateServiceInput
): Promise<Service> {
  const {
    category_id,
    title,
    description,
    base_price,
    duration_minutes,
    images,
    is_active,
  } = input;

  const result = await pool.query<Service>(
    `
    INSERT INTO services (
      provider_id,
      category_id,
      title,
      description,
      base_price,
      duration_minutes,
      images,
      is_active
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE($8, true))
    RETURNING *
    `,
    [
      providerId,
      category_id,
      title,
      description,
      base_price,
      duration_minutes ?? null,
      images ? JSON.stringify(images) : null,
      is_active,
    ]
  );

  return result.rows[0];
}

export async function updateService(
  id: string,
  input: UpdateServiceInput
): Promise<Service | null> {
  const existing = await pool.query<Service>(
    `SELECT * FROM services WHERE id = $1`,
    [id]
  );
  
  if (existing.rows.length === 0) return null;
  
  const existingService = existing.rows[0];
  const existingImages: string[] = Array.isArray((existingService as any).images)
    ? ((existingService as any).images as string[])
    : [];

  const fields: string[] = [];
  const values: any[] = [];
  let index = 1;

  if (input.category_id !== undefined) {
    fields.push(`category_id = $${index++}`);
    values.push(input.category_id);
  }
  if (input.title !== undefined) {
    fields.push(`title = $${index++}`);
    values.push(input.title);
  }
  if (input.description !== undefined) {
    fields.push(`description = $${index++}`);
    values.push(input.description);
  }
  if (input.base_price !== undefined) {
    fields.push(`base_price = $${index++}`);
    values.push(input.base_price);
  }
  if (input.duration_minutes !== undefined) {
    fields.push(`duration_minutes = $${index++}`);
    values.push(input.duration_minutes);
  }

  let newImages: string[] = existingImages;
  if (input.images !== undefined) {
    newImages = input.images ?? [];
    fields.push(`images = $${index++}`);
    values.push(newImages.length ? JSON.stringify(newImages) : null);
  }

  if (input.is_active !== undefined) {
    fields.push(`is_active = $${index++}`);
    values.push(input.is_active);
  }

  if (fields.length === 0) {
    return existingService;
  }

  const query = `
    UPDATE services
    SET ${fields.join(", ")}
    WHERE id = $${index}
    RETURNING *
  `;
  values.push(id);

  const result = await pool.query<Service>(query, values);
  const updated = result.rows[0] || null;

  if (updated && input.images !== undefined) {
    const removedImages = existingImages.filter(
      (url) => !newImages.includes(url)
    );

    for (const url of removedImages) {
      deleteCloudinaryImageByUrl(url).catch((err) =>
        console.error("Cloudinary delete error:", err)
      );
    }
  }

  return updated;
}

export async function deactivateService(id: string): Promise<Service | null> {
  const result = await pool.query<Service>(
    `UPDATE services SET is_active = false WHERE id = $1 RETURNING *`,
    [id]
  );
  return result.rows[0] || null;
}

export async function getServiceByIdForProvider(id: string): Promise<Service | null> {
  const result = await pool.query<Service>(
    `SELECT * FROM services WHERE id = $1 LIMIT 1`,
    [id]
  );
  return result.rows[0] || null;
}


// service.repository.ts
export async function getServiceByIdAdmin(id: string): Promise<ServiceWithProvider | null> {
  const result = await pool.query(`
    SELECT
      s.*,
      c.name as category_name,
      c.slug as category_slug,
      u.id as provider_id,
      u.first_name as provider_first_name,
      u.last_name as provider_last_name,
      u.phone as provider_phone,
      u.profile_image as provider_profile_image,
      bp.business_name,
      bp.business_logo,
      bp.business_description,
      bp.business_email,
      bp.business_phone,
      bp.street_address,
      bp.city,
      bp.state,
      bp.postal_code,
      bp.country,
      bp.latitude,
      bp.longitude
    FROM services s
    LEFT JOIN categories c ON c.id = s.category_id
    JOIN users u ON u.id = s.provider_id
    LEFT JOIN business_profiles bp ON bp.user_id = u.id
    WHERE s.id = $1
    LIMIT 1
  `, [id]);

  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  return {
    id: row.id,
    provider_id: row.provider_id,
    category_id: row.category_id,
    category_name: row.category_name ?? null,
    category_slug: row.category_slug ?? null,
    title: row.title,
    description: row.description,
    base_price: row.base_price,
    duration_minutes: row.duration_minutes,
    images: row.images,
    is_active: row.is_active,
    created_at: row.created_at,
    updated_at: row.updated_at,
    provider: {
      id: row.provider_id,
      first_name: row.provider_first_name,
      last_name: row.provider_last_name,
      phone: row.provider_phone,
      profile_image: row.provider_profile_image,
      business_profile: row.business_name ? {
        business_name: row.business_name,
        business_logo: row.business_logo,
        business_description: row.business_description,
        business_email: row.business_email,
        business_phone: row.business_phone,
        street_address: row.street_address,
        city: row.city,
        state: row.state,
        postal_code: row.postal_code,
        country: row.country,
        latitude: row.latitude,
        longitude: row.longitude,
      } : null,
    },
  };
}

export async function listServicesAdmin(params: {
  categoryId?: string;
  providerId?: string;
  search?: string;
  status?: "all" | "active" | "inactive";
  limit?: number;
  offset?: number;
}): Promise<ServiceWithProvider[]> {
  const { categoryId, providerId, search, status = "all", limit = 20, offset = 0 } = params;

  const conditions: string[] = [
    "u.role = 'provider'",
  ];

  const values: any[] = [];
  let index = 1;

  if (status === "active") conditions.push("s.is_active = true");
  if (status === "inactive") conditions.push("s.is_active = false");

  if (categoryId) {
    conditions.push(`s.category_id = $${index++}`);
    values.push(categoryId);
  }

  if (providerId) {
    conditions.push(`s.provider_id = $${index++}`);
    values.push(providerId);
  }

  if (search && search.trim()) {
    conditions.push(`(
      s.title ILIKE $${index} OR 
      s.description ILIKE $${index} OR
      bp.business_name ILIKE $${index} OR
      c.name ILIKE $${index}
    )`);
    values.push(`%${search.trim()}%`);
    index++;
  }

  const whereClause = conditions.join(" AND ");

  const query = `
    SELECT
      s.*,
      c.name as category_name,
      c.slug as category_slug,
      u.id as provider_id,
      u.first_name as provider_first_name,
      u.last_name as provider_last_name,
      u.phone as provider_phone,
      u.profile_image as provider_profile_image,
      bp.business_name,
      bp.business_logo,
      bp.business_description,
      bp.business_email,
      bp.business_phone,
      bp.street_address,
      bp.city,
      bp.state,
      bp.postal_code,
      bp.country,
      bp.latitude,
      bp.longitude
    FROM services s
    LEFT JOIN categories c ON c.id = s.category_id
    JOIN users u ON u.id = s.provider_id
    LEFT JOIN business_profiles bp ON bp.user_id = u.id
    WHERE ${whereClause}
    ORDER BY s.created_at DESC
    LIMIT $${index} OFFSET $${index + 1}
  `;

  values.push(limit, offset);

  const result = await pool.query(query, values);

  return result.rows.map((row) => ({
    id: row.id,
    provider_id: row.provider_id,
    category_id: row.category_id,
    category_name: row.category_name ?? null,
    category_slug: row.category_slug ?? null,
    title: row.title,
    description: row.description,
    base_price: row.base_price,
    duration_minutes: row.duration_minutes,
    images: row.images,
    is_active: row.is_active,
    created_at: row.created_at,
    updated_at: row.updated_at,
    provider: {
      id: row.provider_id,
      first_name: row.provider_first_name,
      last_name: row.provider_last_name,
      phone: row.provider_phone,
      profile_image: row.provider_profile_image,
      business_profile: row.business_name
        ? {
            business_name: row.business_name,
            business_logo: row.business_logo,
            business_description: row.business_description,
            business_email: row.business_email,
            business_phone: row.business_phone,
            street_address: row.street_address,
            city: row.city,
            state: row.state,
            postal_code: row.postal_code,
            country: row.country,
            latitude: row.latitude,
            longitude: row.longitude,
          }
        : null,
    },
  }));
}

export async function countServicesAdmin(params: {
  categoryId?: string;
  providerId?: string;
  search?: string;
  status?: "all" | "active" | "inactive";
}): Promise<number> {
  const { categoryId, providerId, search, status = "all" } = params;

  const conditions: string[] = [
    "u.role = 'provider'",
  ];

  const values: any[] = [];
  let index = 1;

  if (status === "active") conditions.push("s.is_active = true");
  if (status === "inactive") conditions.push("s.is_active = false");

  if (categoryId) {
    conditions.push(`s.category_id = $${index++}`);
    values.push(categoryId);
  }

  if (providerId) {
    conditions.push(`s.provider_id = $${index++}`);
    values.push(providerId);
  }

  if (search && search.trim()) {
    conditions.push(`(
      s.title ILIKE $${index} OR 
      s.description ILIKE $${index} OR
      bp.business_name ILIKE $${index}
    )`);
    values.push(`%${search.trim()}%`);
    index++;
  }

  const whereClause = conditions.join(" AND ");

  const query = `
    SELECT COUNT(*) as count
    FROM services s
    JOIN users u ON u.id = s.provider_id
    LEFT JOIN business_profiles bp ON bp.user_id = u.id
    WHERE ${whereClause}
  `;

  const result = await pool.query(query, values);
  return parseInt(result.rows[0]?.count || "0", 10);
}


