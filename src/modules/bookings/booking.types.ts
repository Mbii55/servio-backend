// src/modules/bookings/booking.types.ts
export type BookingStatus =
  | "pending"
  | "accepted"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "rejected";

export type PaymentMethod = "cash" | "card" | "wallet" | "noqoody";
export type PaymentStatus = "pending" | "paid" | "refunded";

export interface Booking {
  id: string;
  booking_number: string;
  customer_id: string;
  provider_id: string;
  service_id: string;
  address_id: string | null;
  scheduled_date: string; // DATE
  scheduled_time: string; // TIME
  status: BookingStatus;
  service_price: string; // DECIMAL
  addons_price: string;
  subtotal: string;
  commission_amount: string;
  provider_earnings: string;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  customer_notes: string | null;
  provider_notes: string | null;
  cancellation_reason: string | null;
  accepted_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface BookingAddonInput {
  addon_id: string;
  quantity?: number;
}
