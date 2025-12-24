// src/modules/services/service.types.ts

export interface ProviderSummary {
  id: string;
  first_name: string;
  last_name: string;
  phone?: string | null;
  profile_image?: string | null;

  business_profile: {
    business_name?: string | null;
    business_logo?: string | null;
    business_description?: string | null;
    business_email?: string | null;
    business_phone?: string | null;

    street_address?: string | null;
    city?: string | null;
    state?: string | null;
    postal_code?: string | null;
    country?: string | null;

    latitude?: string | null;
    longitude?: string | null;
  } | null;
}

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

// ✅ THIS is what your repository is trying to import
export type ServiceWithProvider = Service & {
  provider: ProviderSummary;
};

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
