// src/modules/categories/category.repository.ts
import pool from "../../config/database";
import { Category, CreateCategoryInput, UpdateCategoryInput } from "./category.types";

export async function getActiveCategories(): Promise<Category[]> {
  const result = await pool.query<Category>(
    `SELECT * FROM categories WHERE is_active = true ORDER BY sort_order ASC, name ASC`
  );
  return result.rows;
}

export async function getCategoryById(id: string): Promise<Category | null> {
  const result = await pool.query<Category>(
    `SELECT * FROM categories WHERE id = $1 LIMIT 1`,
    [id]
  );
  return result.rows[0] || null;
}

export async function getCategoryBySlug(slug: string): Promise<Category | null> {
  const result = await pool.query<Category>(
    `SELECT * FROM categories WHERE slug = $1 LIMIT 1`,
    [slug]
  );
  return result.rows[0] || null;
}

export async function createCategory(input: CreateCategoryInput): Promise<Category> {
  const { name, slug, description, icon, sort_order, is_active } = input;

  const result = await pool.query<Category>(
    `
    INSERT INTO categories (
      name, slug, description, icon, is_active, sort_order
    )
    VALUES ($1, $2, $3, $4, COALESCE($5, true), COALESCE($6, 0))
    RETURNING *
    `,
    [name, slug, description ?? null, icon ?? null, is_active, sort_order ?? 0]
  );
  return result.rows[0];
}

export async function updateCategory(
  id: string,
  input: UpdateCategoryInput
): Promise<Category | null> {
  // Build dynamic query based on provided fields
  const fields: string[] = [];
  const values: any[] = [];
  let index = 1;

  if (input.name !== undefined) {
    fields.push(`name = $${index++}`);
    values.push(input.name);
  }
  if (input.slug !== undefined) {
    fields.push(`slug = $${index++}`);
    values.push(input.slug);
  }
  if (input.description !== undefined) {
    fields.push(`description = $${index++}`);
    values.push(input.description);
  }
  if (input.icon !== undefined) {
    fields.push(`icon = $${index++}`);
    values.push(input.icon);
  }
  if (input.is_active !== undefined) {
    fields.push(`is_active = $${index++}`);
    values.push(input.is_active);
  }
  if (input.sort_order !== undefined) {
    fields.push(`sort_order = $${index++}`);
    values.push(input.sort_order);
  }

  if (fields.length === 0) {
    const existing = await getCategoryById(id);
    return existing;
  }

  const query = `
    UPDATE categories
    SET ${fields.join(", ")}
    WHERE id = $${index}
    RETURNING *
  `;
  values.push(id);

  const result = await pool.query<Category>(query, values);
  return result.rows[0] || null;
}

// soft delete: deactivate category
export async function deactivateCategory(id: string): Promise<Category | null> {
  const result = await pool.query<Category>(
    `
    UPDATE categories
      SET is_active = false
    WHERE id = $1
    RETURNING *
    `,
    [id]
  );
  return result.rows[0] || null;
}
