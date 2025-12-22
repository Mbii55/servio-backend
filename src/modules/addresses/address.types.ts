// src/modules/addresses/address.types.ts
export interface Address {
  id: string; // UUID
  user_id: string;
  label: string | null;
  street_address: string;
  city: string;
  state: string | null;
  postal_code: string | null;
  country: string;
  latitude: string | null; // DECIMAL -> string from pg
  longitude: string | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateAddressInput {
  label?: string;
  street_address: string;
  city: string;
  state?: string;
  postal_code?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  is_default?: boolean;
}

export interface UpdateAddressInput {
  label?: string;
  street_address?: string;
  city?: string;
  state?: string | null;
  postal_code?: string | null;
  country?: string;
  latitude?: number | null;
  longitude?: number | null;
  is_default?: boolean;
}
