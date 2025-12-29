export interface Review {
  id: string;
  booking_id: string;
  customer_id: string;
  provider_id: string;
  service_id: string;
  rating: number;
  comment: string | null;
  provider_response: string | null;
  provider_response_at: string | null;
  is_visible: boolean;
  is_verified: boolean;
  is_flagged: boolean;
  flagged_reason: string | null;
  flagged_at: string | null;
  flagged_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateReviewInput {
  booking_id: string;
  rating: number;
  comment?: string;
}

export interface ReviewWithDetails extends Review {
  customer_first_name: string;
  customer_last_name: string;
  customer_profile_image: string | null;
  booking_number: string;
  scheduled_date: string;
  service_title: string;
  service_images: any;
}

export interface ReviewStatistics {
  total_reviews: number;
  average_rating: number;
  five_star_count: number;
  four_star_count: number;
  three_star_count: number;
  two_star_count: number;
  one_star_count: number;
  response_count: number;
}