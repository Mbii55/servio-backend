// src/modules/users/user.types.ts
export type UserRole = "customer" | "provider" | "admin";
export type UserStatus = "active" | "inactive" | "suspended";

export interface User {
  id: string;
  display_id: string; // ✨ NEW - Simple readable ID (e.g., CUS-2024-000001)
  email: string;
  password_hash: string;
  role: UserRole;
  status: UserStatus;
  first_name: string;
  last_name: string;
  phone: string | null;
  profile_image: string | null;
  fcm_token: string | null;
  last_login: string | null;
  created_at: string;
  updated_at: string;
}

/* 🔹 ADMIN LIST VIEW (safe fields only) */
export interface AdminUserListItem {
  id: string;
  display_id: string; // ✨ NEW - For admin display
  email: string;
  role: UserRole;
  status: UserStatus;
  first_name: string;
  last_name: string;
  phone: string | null; // ✨ ADDED
  business_logo: string | null; // ✨ ADDED (for providers)
  created_at: string;
}

/* 🔹 SERVICE TYPE */
export interface Service {
  id: string;
  title: string;
  description: string;
  base_price: number;
  duration_minutes: number | null;
  images: string[] | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/* 🔹 PROVIDER BUSINESS INFO */
export interface ProviderBusinessProfile {
  id: string;
  business_name: string;
  business_description: string | null;
  business_logo: string | null;
  business_email: string | null;
  business_phone: string | null;
  street_address: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
}

/* 🔹 PROVIDER PUBLIC PROFILE (for customers to view) */
export interface ProviderPublicProfile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  profile_image: string | null;
  role: UserRole;
  status: UserStatus;
  created_at: string;
  business: ProviderBusinessProfile | null;
  services: Service[];
}