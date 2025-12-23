// src/modules/addons/addon.repository.ts
import pool from "../../config/database";
import { ServiceAddon, CreateAddonInput, UpdateAddonInput } from "./addon.types";

export async function listAddonsByService(serviceId: string): Promise<ServiceAddon[]> {
  const result = await pool.query<ServiceAddon>(
    `SELECT * FROM service_addons WHERE service_id = $1 ORDER BY created_at ASC`,
    [serviceId]
  );
  return result.rows;
}

export async function getAddonById(id: string): Promise<ServiceAddon | null> {
  const result = await pool.query<ServiceAddon>(
    `SELECT * FROM service_addons WHERE id = $1 LIMIT 1`,
    [id]
  );
  return result.rows[0] || null;
}

export async function createAddon(
  serviceId: string,
  input: CreateAddonInput
): Promise<ServiceAddon> {
  const { name, description, price, is_active } = input;

  const result = await pool.query<ServiceAddon>(
    `
    INSERT INTO service_addons (
      service_id,
      name,
      description,
      price,
      is_active
    )
    VALUES ($1, $2, $3, $4, COALESCE($5, true))
    RETURNING *
    `,
    [serviceId, name, description ?? null, price, is_active]
  );

  return result.rows[0];
}

export async function updateAddon(
  id: string,
  input: UpdateAddonInput
): Promise<ServiceAddon | null> {
  const fields: string[] = [];
  const values: any[] = [];
  let index = 1;

  if (input.name !== undefined) {
    fields.push(`name = $${index++}`);
    values.push(input.name);
  }
  if (input.description !== undefined) {
    fields.push(`description = $${index++}`);
    values.push(input.description);
  }
  if (input.price !== undefined) {
    fields.push(`price = $${index++}`);
    values.push(input.price);
  }
  if (input.is_active !== undefined) {
    fields.push(`is_active = $${index++}`);
    values.push(input.is_active);
  }

  if (fields.length === 0) {
    return getAddonById(id);
  }

  const query = `
    UPDATE service_addons
    SET ${fields.join(", ")}, updated_at = CURRENT_TIMESTAMP
    WHERE id = $${index}
    RETURNING *
  `;
  values.push(id);

  const result = await pool.query<ServiceAddon>(query, values);
  return result.rows[0] || null;
}

export async function deleteAddon(id: string): Promise<boolean> {
  const result = await pool.query(
    `DELETE FROM service_addons WHERE id = $1`,
    [id]
  );
  return result.rowCount !== null && result.rowCount > 0;
}