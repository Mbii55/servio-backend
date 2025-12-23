// src/modules/services/service.repository.ts
import pool from "../../config/database";
import {
  Service,
  CreateServiceInput,
  UpdateServiceInput,
} from "./service.types";
import {
  deleteCloudinaryImageByUrl,
} from "../../utils/cloudinary-delete-by-url"; // ⬅️ new import

export async function listActiveServices(params: {
  categoryId?: string;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<Service[]> {
  const { categoryId, search, limit = 20, offset = 0 } = params;

  const conditions: string[] = ["is_active = true"];
  const values: any[] = [];
  let index = 1;

  if (categoryId) {
    conditions.push(`category_id = $${index++}`);
    values.push(categoryId);
  }

  if (search) {
    conditions.push(`(title ILIKE $${index} OR description ILIKE $${index})`);
    values.push(`%${search}%`);
    index++;
  }

  const whereClause = conditions.length
    ? `WHERE ${conditions.join(" AND ")}`
    : "";

  const query = `
    SELECT *
    FROM services
    ${whereClause}
    ORDER BY created_at DESC
    LIMIT $${index} OFFSET $${index + 1}
  `;
  values.push(limit, offset);

  const result = await pool.query<Service>(query, values);
  return result.rows;
}

export async function getServiceById(id: string): Promise<Service | null> {
  const result = await pool.query<Service>(
    `SELECT * FROM services WHERE id = $1 LIMIT 1`,
    [id]
  );
  return result.rows[0] || null;
}

export async function listServicesByProvider(
  providerId: string
): Promise<Service[]> {
  const result = await pool.query<Service>(
    `SELECT * FROM services WHERE provider_id = $1 ORDER BY created_at DESC`,
    [providerId]
  );
  return result.rows;
}

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
  // 1) Load existing service so we can detect removed images
  const existing = await getServiceById(id);
  if (!existing) return null;

  // pg will give JSONB as plain JS; be defensive
  const existingImages: string[] = Array.isArray(
    (existing as any).images
  )
    ? ((existing as any).images as string[])
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

  // 2) Handle images: track new images so we can delete removed ones
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

  // Nothing to update
  if (fields.length === 0) {
    return existing;
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

  // 3) Delete removed images from Cloudinary (fire-and-forget)
  if (updated && input.images !== undefined) {
    const removedImages = existingImages.filter(
      (url) => !newImages.includes(url)
    );

    for (const url of removedImages) {
      // don't block response on deletes; just log failures
      deleteCloudinaryImageByUrl(url).catch((err) =>
        console.error("Cloudinary delete error:", err)
      );
    }
  }

  return updated;
}

export async function deactivateService(id: string): Promise<Service | null> {
  const result = await pool.query<Service>(
    `
    UPDATE services
    SET is_active = false
    WHERE id = $1
    RETURNING *
    `,
    [id]
  );
  return result.rows[0] || null;
}
