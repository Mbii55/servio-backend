// src/modules/addons/addon.types.ts
export interface ServiceAddon {
  id: string;
  service_id: string;
  name: string;
  description: string | null;
  price: string; // DECIMAL from DB
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateAddonInput {
  name: string;
  description?: string;
  price: number;
  is_active?: boolean;
}

export interface UpdateAddonInput {
  name?: string;
  description?: string;
  price?: number;
  is_active?: boolean;
}