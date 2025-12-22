// src/modules/services/service.types.ts
export interface Service {
  id: string; // UUID
  provider_id: string;
  category_id: string;
  title: string;
  description: string;
  base_price: string; // from DECIMAL
  duration_minutes: number | null;
  images: any | null; // JSONB, we will store string[]
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateServiceInput {
  category_id: string;
  title: string;
  description: string;
  base_price: number;
  duration_minutes?: number;
  images?: string[];
  is_active?: boolean;
}

export interface UpdateServiceInput {
  category_id?: string;
  title?: string;
  description?: string;
  base_price?: number;
  duration_minutes?: number | null;
  images?: string[] | null;
  is_active?: boolean;
}
