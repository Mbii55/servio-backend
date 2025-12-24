// src/modules/favorites/favorite.types.ts

export interface Favorite {
  id: string; // UUID
  user_id: string;
  service_id: string;
  created_at: string;
}

export interface FavoriteService {
  // favorite metadata
  favorite_id: string;
  favorited_at: string;

  // service fields (services table)
  id: string; // service id
  provider_id: string;
  category_id: string;
  title: string;
  description: string;
  base_price: string; // DECIMAL -> string
  duration_minutes: number | null;
  images: any | null; // JSONB
  is_active: boolean;
  created_at: string;
  updated_at: string;

  // optional “nice to have” joins
  category_name: string | null;
  category_slug: string | null;

  provider_first_name: string | null;
  provider_last_name: string | null;
  provider_profile_image: string | null;

  business_name: string | null;
  business_logo: string | null;
  business_city: string | null;
  business_country: string | null;
}
