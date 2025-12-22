// src/modules/availability/availability.types.ts
export type DayOfWeek =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export interface ProviderAvailability {
  id: string;
  provider_id: string;
  day_of_week: DayOfWeek;
  start_time: string;  // "HH:MM:SS"
  end_time: string;    // "HH:MM:SS"
  is_available: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProviderBlockedDate {
  id: string;
  provider_id: string;
  blocked_date: string; // "YYYY-MM-DD"
  reason: string | null;
  created_at: string;
}

export interface CreateAvailabilityInput {
  day_of_week: DayOfWeek;
  start_time: string;   // "HH:MM"
  end_time: string;     // "HH:MM"
  is_available?: boolean;
}

export interface UpdateAvailabilityInput {
  day_of_week?: DayOfWeek;
  start_time?: string;
  end_time?: string;
  is_available?: boolean;
}

export interface CreateBlockedDateInput {
  blocked_date: string; // "YYYY-MM-DD"
  reason?: string;
}
