// src/modules/users/user.repository.ts
import pool from "../../config/database";
import { User, UserRole } from "./user.types";

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
