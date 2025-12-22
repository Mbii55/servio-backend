// src/modules/users/user.types.ts
export type UserRole = "customer" | "provider" | "admin";
export type UserStatus = "active" | "inactive" | "suspended";

export interface User {
  id: string; // UUID
  email: string;
  password_hash: string;
  role: UserRole;
  status: UserStatus;
  first_name: string;
  last_name: string;
  phone: string | null;
  profile_image: string | null;
  fcm_token: string | null;
  last_login: string | null; // ISO string
  created_at: string;
  updated_at: string;
}
