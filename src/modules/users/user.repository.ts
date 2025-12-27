// src/modules/users/user.repository.ts
import pool from "../../config/database";
import { 
  User, 
  UserRole, 
  UserStatus, 
  AdminUserListItem,
  ProviderPublicProfile,
  ProviderBusinessProfile,
  Service
} from "./user.types";

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
export async function adminListUsers(params?: {
  role?: UserRole;
  status?: UserStatus;
  search?: string;
}) {
  const conditions: string[] = [];
  const values: any[] = [];
  let i = 1;

  if (params?.role) {
    conditions.push(`u.role = $${i++}`);
    values.push(params.role);
  }

  if (params?.status) {
    conditions.push(`u.status = $${i++}`);
    values.push(params.status);
  }

  if (params?.search && params.search.trim()) {
    const q = `%${params.search.trim()}%`;
    conditions.push(`(
      u.first_name ILIKE $${i} OR
      u.last_name ILIKE $${i} OR
      CONCAT(u.first_name, ' ', u.last_name) ILIKE $${i} OR
      u.email ILIKE $${i} OR
      COALESCE(u.phone, '') ILIKE $${i} OR
      COALESCE(bp.business_name, '') ILIKE $${i}
    )`);
    values.push(q);
    i++;
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const sql = `
    SELECT
      u.id,
      u.email,
      u.role,
      u.status,
      u.first_name,
      u.last_name,
      u.phone,
      u.profile_image,
      u.created_at,
      u.updated_at,

      bp.business_logo
    FROM users u
    LEFT JOIN business_profiles bp ON bp.user_id = u.id
    ${whereClause}
    ORDER BY u.created_at DESC
  `;

  const res = await pool.query(sql, values);
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

/* 🔹 GET ALL ACTIVE PROVIDERS WITH SERVICES (MAIN FUNCTION) */
export async function getActiveProvidersWithServices(): Promise<ProviderPublicProfile[]> {
  const q = `
    WITH provider_services AS (
      SELECT 
        s.provider_id,
        JSON_AGG(
          JSON_BUILD_OBJECT(
            'id', s.id,
            'title', s.title,
            'description', s.description,
            'base_price', s.base_price,
            'duration_minutes', s.duration_minutes,
            'images', s.images,
            'is_active', s.is_active,
            'created_at', s.created_at,
            'updated_at', s.updated_at
          ) ORDER BY s.created_at DESC
        ) FILTER (WHERE s.is_active = true) as services
      FROM services s
      GROUP BY s.provider_id
    )
    SELECT 
      u.id, 
      u.email, 
      u.first_name, 
      u.last_name, 
      u.phone, 
      u.profile_image, 
      u.role, 
      u.status, 
      u.created_at,
      bp.id as business_id,
      bp.business_name,
      bp.business_description,
      bp.business_logo,               -- ✅ ADD THIS LINE
      bp.business_email,
      bp.business_phone,
      bp.street_address,
      bp.city,
      bp.state,
      bp.postal_code,
      bp.country,
      bp.latitude,
      bp.longitude,
      COALESCE(ps.services, '[]'::json) as services
    FROM users u
    LEFT JOIN business_profiles bp ON u.id = bp.user_id
    LEFT JOIN provider_services ps ON u.id = ps.provider_id
    WHERE u.role = 'provider' 
      AND u.status = 'active'
    ORDER BY u.first_name, u.last_name
  `;
  
  const res = await pool.query(q);
  
  return res.rows.map(row => {
    let business: ProviderBusinessProfile | null = null;
    
    if (row.business_id) {
      business = {
        id: row.business_id,
        business_name: row.business_name,
        business_description: row.business_description,
        business_logo: row.business_logo,
        business_email: row.business_email,
        business_phone: row.business_phone,
        street_address: row.street_address,
        city: row.city,
        state: row.state,
        postal_code: row.postal_code,
        country: row.country,
        latitude: row.latitude,
        longitude: row.longitude
      };
    }
    
    return {
      id: row.id,
      email: row.email,
      first_name: row.first_name,
      last_name: row.last_name,
      phone: row.phone,
      profile_image: row.profile_image,
      role: row.role,
      status: row.status,
      created_at: row.created_at,
      business,
      services: row.services || []
    };
  });
}

/* 🔹 GET SINGLE PROVIDER PROFILE WITH SERVICES */
export async function getProviderProfileWithServices(providerId: string): Promise<ProviderPublicProfile | null> {
  const q = `
    WITH provider_services AS (
      SELECT 
        s.provider_id,
        JSON_AGG(
          JSON_BUILD_OBJECT(
            'id', s.id,
            'title', s.title,
            'description', s.description,
            'base_price', s.base_price,
            'duration_minutes', s.duration_minutes,
            'images', s.images,
            'is_active', s.is_active,
            'created_at', s.created_at,
            'updated_at', s.updated_at
          ) ORDER BY s.created_at DESC
        ) FILTER (WHERE s.is_active = true) as services
      FROM services s
      WHERE s.provider_id = $1
      GROUP BY s.provider_id
    )
    SELECT 
      u.id, 
      u.email, 
      u.first_name, 
      u.last_name, 
      u.phone, 
      u.profile_image, 
      u.role, 
      u.status, 
      u.created_at,
      bp.id as business_id,
      bp.business_name,
      bp.business_description,
      bp.business_logo,               -- ✅ ADD THIS LINE
      bp.business_email,
      bp.business_phone,
      bp.street_address,
      bp.city,
      bp.state,
      bp.postal_code,
      bp.country,
      bp.latitude,
      bp.longitude,
      COALESCE(ps.services, '[]'::json) as services
    FROM users u
    LEFT JOIN business_profiles bp ON u.id = bp.user_id
    LEFT JOIN provider_services ps ON u.id = ps.provider_id
    WHERE u.id = $1 
      AND u.role = 'provider' 
      AND u.status = 'active'
    LIMIT 1
  `;
  
  const res = await pool.query(q, [providerId]);
  
  if (res.rows.length === 0) {
    return null;
  }
  
  const row = res.rows[0];
  let business: ProviderBusinessProfile | null = null;
  
  if (row.business_id) {
    business = {
      id: row.business_id,
      business_name: row.business_name,
      business_description: row.business_description,
      business_logo: row.business_logo,
      business_email: row.business_email,
      business_phone: row.business_phone,
      street_address: row.street_address,
      city: row.city,
      state: row.state,
      postal_code: row.postal_code,
      country: row.country,
      latitude: row.latitude,
      longitude: row.longitude
    };
  }
  
  return {
    id: row.id,
    email: row.email,
    first_name: row.first_name,
    last_name: row.last_name,
    phone: row.phone,
    profile_image: row.profile_image,
    role: row.role,
    status: row.status,
    created_at: row.created_at,
    business,
    services: row.services || []
  };
}

/* 🔹 SEARCH PROVIDERS BY NAME WITH SERVICES */
export async function searchProvidersByName(searchTerm: string): Promise<ProviderPublicProfile[]> {
  const q = `
    WITH provider_services AS (
      SELECT 
        s.provider_id,
        JSON_AGG(
          JSON_BUILD_OBJECT(
            'id', s.id,
            'title', s.title,
            'description', s.description,
            'base_price', s.base_price,
            'duration_minutes', s.duration_minutes,
            'images', s.images,
            'is_active', s.is_active,
            'created_at', s.created_at,
            'updated_at', s.updated_at
          ) ORDER BY s.created_at DESC
        ) FILTER (WHERE s.is_active = true) as services
      FROM services s
      GROUP BY s.provider_id
    )
    SELECT 
      u.id, 
      u.email, 
      u.first_name, 
      u.last_name, 
      u.phone, 
      u.profile_image, 
      u.role, 
      u.status, 
      u.created_at,
      bp.id as business_id,
      bp.business_name,
      bp.business_description,
      bp.business_logo,               -- ✅ ADD THIS LINE
      bp.business_email,
      bp.business_phone,
      bp.street_address,
      bp.city,
      bp.state,
      bp.postal_code,
      bp.country,
      bp.latitude,
      bp.longitude,
      COALESCE(ps.services, '[]'::json) as services
    FROM users u
    LEFT JOIN business_profiles bp ON u.id = bp.user_id
    LEFT JOIN provider_services ps ON u.id = ps.provider_id
    WHERE u.role = 'provider' 
      AND u.status = 'active'
      AND (
        u.first_name ILIKE $1 
        OR u.last_name ILIKE $1 
        OR CONCAT(u.first_name, ' ', u.last_name) ILIKE $1
        OR bp.business_name ILIKE $1
        OR bp.business_description ILIKE $1
      )
    ORDER BY u.first_name, u.last_name
  `;
  
  const res = await pool.query(q, [`%${searchTerm}%`]);
  
  return res.rows.map(row => {
    let business: ProviderBusinessProfile | null = null;
    
    if (row.business_id) {
      business = {
        id: row.business_id,
        business_name: row.business_name,
        business_description: row.business_description,
        business_logo: row.business_logo,
        business_email: row.business_email,
        business_phone: row.business_phone,
        street_address: row.street_address,
        city: row.city,
        state: row.state,
        postal_code: row.postal_code,
        country: row.country,
        latitude: row.latitude,
        longitude: row.longitude
      };
    }
    
    return {
      id: row.id,
      email: row.email,
      first_name: row.first_name,
      last_name: row.last_name,
      phone: row.phone,
      profile_image: row.profile_image,
      role: row.role,
      status: row.status,
      created_at: row.created_at,
      business,
      services: row.services || []
    };
  });
}

/* 🔹 BASIC PROVIDER LIST (LEGACY - WITHOUT SERVICES) */
export async function getActiveProvidersBasic(): Promise<ProviderPublicProfile[]> {
  const q = `
    SELECT 
      u.id, 
      u.email, 
      u.first_name, 
      u.last_name, 
      u.phone, 
      u.profile_image, 
      u.role, 
      u.status, 
      u.created_at,
      bp.id as business_id,
      bp.business_name,
      bp.business_description,
      bp.business_logo,               -- ✅ ADD THIS LINE
      bp.business_email,
      bp.business_phone,
      bp.street_address,
      bp.city,
      bp.state,
      bp.postal_code,
      bp.country,
      bp.latitude,
      bp.longitude
    FROM users u
    LEFT JOIN business_profiles bp ON u.id = bp.user_id
    WHERE u.role = 'provider' 
      AND u.status = 'active'
    ORDER BY u.first_name, u.last_name
  `;
  
  const res = await pool.query(q);
  
  return res.rows.map(row => {
    let business: ProviderBusinessProfile | null = null;
    
    if (row.business_id) {
      business = {
        id: row.business_id,
        business_name: row.business_name,
        business_description: row.business_description,
        business_logo: row.business_logo,
        business_email: row.business_email,
        business_phone: row.business_phone,
        street_address: row.street_address,
        city: row.city,
        state: row.state,
        postal_code: row.postal_code,
        country: row.country,
        latitude: row.latitude,
        longitude: row.longitude
      };
    }
    
    return {
      id: row.id,
      email: row.email,
      first_name: row.first_name,
      last_name: row.last_name,
      phone: row.phone,
      profile_image: row.profile_image,
      role: row.role,
      status: row.status,
      created_at: row.created_at,
      business,
      services: [] // Empty array for basic version
    };
  });
}

// src/modules/users/user.repository.ts

// Add these functions at the end of the file

export async function searchProviders(params: {
  query?: string;
  limit?: number;
  offset?: number;
}): Promise<any[]> {
  const { query, limit = 20, offset = 0 } = params;

  const conditions: string[] = [
    "u.role = 'provider'",
    "u.status = 'active'"
  ];
  const values: any[] = [];
  let index = 1;

  if (query && query.trim()) {
    conditions.push(`(
      bp.business_name ILIKE $${index} OR
      bp.business_description ILIKE $${index} OR
      CONCAT(u.first_name, ' ', u.last_name) ILIKE $${index}
    )`);
    values.push(`%${query.trim()}%`);
    index++;
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const sql = `
    SELECT
      u.id,
      u.email,
      u.first_name,
      u.last_name,
      u.phone,
      u.profile_image,
      u.status,

      bp.id AS business_id,
      bp.business_name,
      bp.business_description,
      bp.business_logo,
      bp.business_email,
      bp.business_phone,
      bp.city,
      bp.country,

      (
        SELECT COUNT(*)::int
        FROM services s
        WHERE s.provider_id = u.id AND s.is_active = true
      ) AS service_count

    FROM users u
    LEFT JOIN business_profiles bp ON bp.user_id = u.id
    ${whereClause}
    ORDER BY bp.business_name ASC, u.first_name ASC
    LIMIT $${index} OFFSET $${index + 1}
  `;

  values.push(limit, offset);
  const { rows } = await pool.query(sql, values);
  return rows;
}

export async function countSearchProviders(params: {
  query?: string;
}): Promise<number> {
  const { query } = params;

  const conditions: string[] = [
    "u.role = 'provider'",
    "u.status = 'active'"
  ];
  const values: any[] = [];
  let index = 1;

  if (query && query.trim()) {
    conditions.push(`(
      bp.business_name ILIKE $${index} OR
      bp.business_description ILIKE $${index} OR
      CONCAT(u.first_name, ' ', u.last_name) ILIKE $${index}
    )`);
    values.push(`%${query.trim()}%`);
    index++;
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const sql = `
    SELECT COUNT(*) as count
    FROM users u
    LEFT JOIN business_profiles bp ON bp.user_id = u.id
    ${whereClause}
  `;

  const { rows } = await pool.query(sql, values);
  return parseInt(rows[0]?.count || '0', 10);
}