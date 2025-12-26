// src/modules/favorites/favorite.types.ts

export type FavoriteType = 'service' | 'provider';

export interface Favorite {
  id: string;
  user_id: string;
  favorite_type: FavoriteType;
  service_id: string | null;
  provider_id: string | null;
  created_at: string;
}

export interface FavoriteService {
  // favorite metadata
  favorite_id: string;
  favorited_at: string;
  favorite_type: 'service';

  // service fields
  id: string;
  provider_id: string;
  category_id: string;
  title: string;
  description: string;
  base_price: string;
  duration_minutes: number | null;
  images: any | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;

  // optional joins
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

export interface FavoriteProvider {
  // favorite metadata
  favorite_id: string;
  favorited_at: string;
  favorite_type: 'provider';

  // provider fields
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  profile_image: string | null;
  status: string;

  // business profile
  business_id: string | null;
  business_name: string | null;
  business_description: string | null;
  business_logo: string | null;
  business_email: string | null;
  business_phone: string | null;
  city: string | null;
  country: string | null;

  // service count
  service_count: number;
}

export type FavoriteItem = FavoriteService | FavoriteProvider;