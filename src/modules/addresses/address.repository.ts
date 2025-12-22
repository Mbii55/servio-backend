// src/modules/addresses/address.repository.ts
import pool from "../../config/database";
import { Address, CreateAddressInput, UpdateAddressInput } from "./address.types";

export async function listAddressesForUser(userId: string): Promise<Address[]> {
  const result = await pool.query<Address>(
    `
    SELECT *
    FROM addresses
    WHERE user_id = $1
    ORDER BY is_default DESC, created_at DESC
    `,
    [userId]
  );
  return result.rows;
}

export async function getAddressById(id: string): Promise<Address | null> {
  const result = await pool.query<Address>(
    `SELECT * FROM addresses WHERE id = $1 LIMIT 1`,
    [id]
  );
  return result.rows[0] || null;
}

export async function createAddress(
  userId: string,
  input: CreateAddressInput
): Promise<Address> {
  const {
    label,
    street_address,
    city,
    state,
    postal_code,
    country,
    latitude,
    longitude,
    is_default,
  } = input;

  const result = await pool.query<Address>(
    `
    INSERT INTO addresses (
      user_id,
      label,
      street_address,
      city,
      state,
      postal_code,
      country,
      latitude,
      longitude,
      is_default
    )
    VALUES ($1,$2,$3,$4,$5,$6,COALESCE($7,'Qatar'),$8,$9,COALESCE($10,false))
    RETURNING *
    `,
    [
      userId,
      label ?? null,
      street_address,
      city,
      state ?? null,
      postal_code ?? null,
      country ?? "Qatar",
      latitude ?? null,
      longitude ?? null,
      is_default ?? false,
    ]
  );

  const address = result.rows[0];

  // If this address is_default, unset others for this user
  if (address.is_default) {
    await pool.query(
      `
      UPDATE addresses
      SET is_default = false
      WHERE user_id = $1 AND id <> $2
      `,
      [userId, address.id]
    );
  }

  return address;
}

export async function updateAddress(
  id: string,
  userId: string,
  input: UpdateAddressInput
): Promise<Address | null> {
  const fields: string[] = [];
  const values: any[] = [];
  let index = 1;

  if (input.label !== undefined) {
    fields.push(`label = $${index++}`);
    values.push(input.label);
  }
  if (input.street_address !== undefined) {
    fields.push(`street_address = $${index++}`);
    values.push(input.street_address);
  }
  if (input.city !== undefined) {
    fields.push(`city = $${index++}`);
    values.push(input.city);
  }
  if (input.state !== undefined) {
    fields.push(`state = $${index++}`);
    values.push(input.state);
  }
  if (input.postal_code !== undefined) {
    fields.push(`postal_code = $${index++}`);
    values.push(input.postal_code);
  }
  if (input.country !== undefined) {
    fields.push(`country = $${index++}`);
    values.push(input.country);
  }
  if (input.latitude !== undefined) {
    fields.push(`latitude = $${index++}`);
    values.push(input.latitude);
  }
  if (input.longitude !== undefined) {
    fields.push(`longitude = $${index++}`);
    values.push(input.longitude);
  }
  if (input.is_default !== undefined) {
    fields.push(`is_default = $${index++}`);
    values.push(input.is_default);
  }

  if (fields.length === 0) {
    const existing = await getAddressById(id);
    return existing;
  }

  const query = `
    UPDATE addresses
    SET ${fields.join(", ")}
    WHERE id = $${index} AND user_id = $${index + 1}
    RETURNING *
  `;
  values.push(id, userId);

  const result = await pool.query<Address>(query, values);
  const updated = result.rows[0];

  if (!updated) return null;

  // handle default switching
  if (input.is_default === true) {
    await pool.query(
      `
      UPDATE addresses
      SET is_default = false
      WHERE user_id = $1 AND id <> $2
      `,
      [userId, id]
    );
  }

  return updated;
}

export async function deleteAddress(
  id: string,
  userId: string
): Promise<boolean> {
  const result = await pool.query(
    `DELETE FROM addresses WHERE id = $1 AND user_id = $2`,
    [id, userId]
  );

  // rowCount is typed as number | null, so we normalize it
  const affectedRows = result.rowCount ?? 0;
  return affectedRows > 0;
}
