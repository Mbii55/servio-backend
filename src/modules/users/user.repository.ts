// src/modules/users/user.repository.ts
import pool from "../../config/database";
import { User, UserRole, UserStatus, AdminUserListItem } from "./user.types";

/* EXISTING FUNCTIONS — UNCHANGED */
export async function findUserByEmail(email: string): Promise<User | null> {
  const result = await pool.query<User>(
    `SELECT * FROM users WHERE email = $1 LIMIT 1`,
    [email]
  );
  return result.rows[0] || null;
}

interface CreateUserInput {
  email: string;
  passwordHash: string;
  role: UserRole;
  firstName: string;
  lastName: string;
  phone?: string;
}

export async function createUser(input: CreateUserInput): Promise<User> {
  const { email, passwordHash, role, firstName, lastName, phone } = input;

  const result = await pool.query<User>(
    `
    INSERT INTO users (
      email,
      password_hash,
      role,
      first_name,
      last_name,
      phone
    )
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
    `,
    [email, passwordHash, role, firstName, lastName, phone ?? null]
  );

  return result.rows[0];
}

export async function updateLastLogin(userId: string): Promise<void> {
  await pool.query(
    `UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1`,
    [userId]
  );
}

export async function findUserById(id: string): Promise<User | null> {
  const result = await pool.query<User>(
    `SELECT * FROM users WHERE id = $1 LIMIT 1`,
    [id]
  );
  return result.rows[0] || null;
}

/* EXISTING profile update — unchanged */
export async function updateUserProfile(
  userId: string,
  input: {
    first_name?: string;
    last_name?: string;
    phone?: string | null;
    profile_image?: string | null;
  }
): Promise<User | null> {
  const fields: string[] = [];
  const values: any[] = [];
  let idx = 1;

  if (input.first_name !== undefined) {
    fields.push(`first_name = $${idx++}`);
    values.push(input.first_name);
  }

  if (input.last_name !== undefined) {
    fields.push(`last_name = $${idx++}`);
    values.push(input.last_name);
  }

  if (input.phone !== undefined) {
    fields.push(`phone = $${idx++}`);
    values.push(input.phone);
  }

  if (input.profile_image !== undefined) {
    fields.push(`profile_image = $${idx++}`);
    values.push(input.profile_image);
  }

  if (fields.length === 0) return null;

  const q = `
    UPDATE users
    SET ${fields.join(", ")}, updated_at = CURRENT_TIMESTAMP
    WHERE id = $${idx}
    RETURNING *
  `;
  values.push(userId);

  const res = await pool.query<User>(q, values);
  return res.rows[0] || null;
}

/* 🔹 ADMIN: LIST USERS (EXCLUDES ADMINS) */
export async function adminListUsers(
  role?: UserRole
): Promise<AdminUserListItem[]> {
  const params: any[] = [];
  let q = `
    SELECT id, email, role, status, first_name, last_name, created_at
    FROM users
    WHERE role != 'admin'
  `;

  if (role) {
    params.push(role);
    q += ` AND role = $${params.length}`;
  }

  q += ` ORDER BY created_at DESC`;

  const res = await pool.query<AdminUserListItem>(q, params);
  return res.rows;
}

/* 🔹 ADMIN: UPDATE USER STATUS (RETURNS UPDATED USER OR NULL) */
export async function adminUpdateUserStatus(
  userId: string,
  status: UserStatus
): Promise<Pick<User, "id" | "email" | "role" | "status" | "first_name" | "last_name" | "created_at"> | null> {
  const res = await pool.query(
    `
    UPDATE users
    SET status = $1, updated_at = CURRENT_TIMESTAMP
    WHERE id = $2 AND role != 'admin'
    RETURNING id, email, role, status, first_name, last_name, created_at
    `,
    [status, userId]
  );

  return res.rows[0] || null;
}

/* EXISTING push token */
export async function updateUserPushToken(userId: string, expoPushToken: string) {
  const res = await pool.query(
    `
    UPDATE users
    SET fcm_token = $1, updated_at = NOW()
    WHERE id = $2
    RETURNING id, email, role, first_name, last_name, phone, status, profile_image, fcm_token, created_at
    `,
    [expoPushToken, userId]
  );
  return res.rows[0] || null;
}
