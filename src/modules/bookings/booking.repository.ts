// src/modules/bookings/booking.repository.ts
import pool from "../../config/database";
import { Booking, BookingStatus, BookingAddonInput } from "./booking.types";
import { getCommissionRateForProvider } from "../businessProfiles/businessProfile.repository";
import { createEarningsForBooking } from "../earnings/earnings.repository";


/**
 * ✅ NEW: Check if provider is verified before allowing bookings
 */
export async function isProviderVerified(providerId: string): Promise<boolean> {
  const result = await pool.query(
    `
    SELECT bp.verification_status
    FROM business_profiles bp
    WHERE bp.user_id = $1
    LIMIT 1
    `,
    [providerId]
  );

  if (result.rows.length === 0) return false;
  
  return result.rows[0].verification_status === 'approved';
}

/**
 * ✅ UPDATED: Create booking with verification check
 */
export async function createBookingWithAddons(input: {
  customerId: string;
  serviceId: string;
  addressId?: string;
  scheduled_date: string;
  scheduled_time: string;
  addons?: { addon_id: string; quantity?: number }[];
  payment_method?: "cash" | "card" | "wallet";
  customer_notes?: string;
}): Promise<any> {
  const client = await pool.connect();
  
  try {
    await client.query("BEGIN");

    // 1️⃣ Fetch service and get provider_id
    const serviceResult = await client.query(
      `SELECT id, provider_id, base_price, title FROM services WHERE id = $1`,
      [input.serviceId]
    );
    
    if (serviceResult.rows.length === 0) {
      throw new Error("Service not found");
    }
    
    const service = serviceResult.rows[0];
    const providerId = service.provider_id;
    
    // ✅ Parse service price properly
    const servicePrice = parseFloat(service.base_price);
    
    console.log('Service details:', {
      id: service.id,
      providerId,
      base_price: service.base_price,
      servicePrice: servicePrice
    });

    // 2️⃣ CHECK PROVIDER VERIFICATION STATUS
    const verificationCheck = await client.query(
      `
      SELECT bp.verification_status
      FROM business_profiles bp
      WHERE bp.user_id = $1
      LIMIT 1
      `,
      [providerId]
    );

    if (verificationCheck.rows.length === 0) {
      throw new Error("Provider business profile not found");
    }

    const verificationStatus = verificationCheck.rows[0].verification_status;

    if (verificationStatus !== 'approved') {
      throw new Error("This provider is not yet verified. Bookings are not available at this time.");
    }

    // 3️⃣ Get provider's commission rate
    const commissionResult = await client.query(
      `SELECT commission_rate FROM business_profiles WHERE user_id = $1`,
      [providerId]
    );
    
    const commissionRate = commissionResult.rows[0]?.commission_rate 
      ? parseFloat(commissionResult.rows[0].commission_rate) 
      : 15.00;

    // 4️⃣ Handle addons if provided
    let addonsPrice = 0;
    const addonRecords: Array<{
      addon_id: string;
      addon_name: string;
      addon_price: string;
      quantity: number;
    }> = [];

    if (input.addons && input.addons.length > 0) {
      const addonIds = input.addons.map((a) => a.addon_id);
      const addonResult = await client.query(
        `SELECT id, name, price FROM service_addons WHERE id = ANY($1::uuid[])`,
        [addonIds]
      );

      for (const addonRow of addonResult.rows) {
        const inputAddon = input.addons.find((a) => a.addon_id === addonRow.id);
        const quantity = inputAddon?.quantity ?? 1;
        const price = parseFloat(addonRow.price);
        const lineTotal = price * quantity;

        addonsPrice += lineTotal;
        addonRecords.push({
          addon_id: addonRow.id,
          addon_name: addonRow.name,
          addon_price: addonRow.price,
          quantity,
        });
      }
    }

    // 5️⃣ Calculate totals
    const subtotal = servicePrice + addonsPrice;
    const commissionAmount = parseFloat(((subtotal * commissionRate) / 100).toFixed(2));
    const providerEarnings = parseFloat((subtotal - commissionAmount).toFixed(2));

    console.log('Booking calculations:', {
      servicePrice,
      addonsPrice,
      subtotal,
      commissionRate,
      commissionAmount,
      providerEarnings
    });

    // 6️⃣ Insert booking - WITH service_price column
    const bookingResult = await client.query(
      `
      INSERT INTO bookings (
        customer_id,
        provider_id,
        service_id,
        address_id,
        scheduled_date,
        scheduled_time,
        status,
        payment_method,
        payment_status,
        service_price,
        addons_price,
        subtotal,
        commission_rate,
        commission_amount,
        provider_earnings,
        customer_notes
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *
      `,
      [
        input.customerId,
        providerId,
        input.serviceId,
        input.addressId ?? null,
        input.scheduled_date,
        input.scheduled_time,
        "pending",
        input.payment_method ?? "cash",
        "pending",
        servicePrice,           // $10 - service_price ✅
        addonsPrice,            // $11 - addons_price ✅
        subtotal,               // $12 - subtotal ✅
        commissionRate,         // $13 - commission_rate ✅
        commissionAmount,       // $14 - commission_amount ✅
        providerEarnings,       // $15 - provider_earnings ✅
        input.customer_notes ?? null, // $16 - customer_notes ✅
      ]
    );

    const booking = bookingResult.rows[0];

    // 7️⃣ Insert booking_addons
    if (addonRecords.length > 0) {
      for (const addon of addonRecords) {
        await client.query(
          `
          INSERT INTO booking_addons (booking_id, addon_id, addon_name, addon_price, quantity)
          VALUES ($1, $2, $3, $4, $5)
          `,
          [booking.id, addon.addon_id, addon.addon_name, addon.addon_price, addon.quantity]
        );
      }
    }

    await client.query("COMMIT");

    console.log('✅ Booking created successfully:', booking.id);

    // Return booking with provider_id
    return {
      ...booking,
      provider_id: providerId,
    };
    
  } catch (error) {
    await client.query("ROLLBACK");
    console.error('❌ Booking creation error:', error);
    throw error;
  } finally {
    client.release();
  }
}

export async function getBookingById(id: string): Promise<any | null> {
  const res = await pool.query(
    `
    SELECT
      b.*,

      -- service info
      s.title AS service_title,
      s.images AS service_images,

      -- provider business info
      bp.business_name AS provider_business_name,
      bp.business_logo AS provider_business_logo,
      bp.business_phone AS provider_business_phone,
      bp.business_email AS provider_business_email,
      bp.street_address AS provider_street_address,
      bp.city AS provider_city,
      bp.country AS provider_country,

      -- addons list as JSON array
      COALESCE(
        json_agg(
          json_build_object(
            'id', ba.id,
            'addon_id', ba.addon_id,
            'addon_name', ba.addon_name,
            'addon_price', ba.addon_price,
            'quantity', ba.quantity
          )
        ) FILTER (WHERE ba.id IS NOT NULL),
        '[]'::json
      ) AS addons

    FROM bookings b
    JOIN services s ON s.id = b.service_id
    LEFT JOIN business_profiles bp ON bp.user_id = b.provider_id
    LEFT JOIN booking_addons ba ON ba.booking_id = b.id
    WHERE b.id = $1
    GROUP BY
      b.id,
      s.title, s.images,
      bp.business_name, bp.business_logo, bp.business_phone, bp.business_email,
      bp.street_address, bp.city, bp.country
    LIMIT 1
    `,
    [id]
  );

  return res.rows[0] || null;
}


/**
 * ✅ UPDATED: list bookings + include service title/images + provider shop name/logo
 * Returns rows with extra fields:
 * - service_title, service_images
 * - provider_business_name, provider_business_logo
 * - provider_first_name, provider_last_name
 */
export async function listBookingsForUser(
  userId: string,
  role: "customer" | "provider" | "admin"
): Promise<any[]> {
  const where =
    role === "admin"
      ? ""
      : role === "customer"
      ? "WHERE b.customer_id = $1"
      : "WHERE b.provider_id = $1";

  const values: any[] = role === "admin" ? [] : [userId];

  const res = await pool.query(
    `
    SELECT
      b.*,

      -- service info
      s.title AS service_title,
      s.images AS service_images,

      -- provider user fallback
      pu.first_name AS provider_first_name,
      pu.last_name  AS provider_last_name,

      -- provider shop info
      bp.business_name AS provider_business_name,
      bp.business_logo AS provider_business_logo

    FROM bookings b
    LEFT JOIN services s
      ON s.id = b.service_id

    LEFT JOIN users pu
      ON pu.id = b.provider_id

    LEFT JOIN business_profiles bp
      ON bp.user_id = b.provider_id

    ${where}
    ORDER BY b.created_at DESC
    `,
    values
  );

  return res.rows;
}

const VALID_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  pending: ["accepted", "rejected", "cancelled"],
  accepted: ["in_progress", "cancelled"],
  in_progress: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
  rejected: [],
};

export async function updateBookingStatus(
  id: string,
  newStatus: BookingStatus,
  options: {
    cancellation_reason?: string;
    provider_notes?: string;
  }
): Promise<Booking | null> {
  const client = await pool.connect();
  
  try {
    await client.query("BEGIN");

    /* ======================================================
       1. Fetch existing booking
    ====================================================== */
    const existingRes = await client.query<Booking>(
      `SELECT * FROM bookings WHERE id = $1 LIMIT 1`,
      [id]
    );
    const existing = existingRes.rows[0];
    if (!existing) {
      await client.query("ROLLBACK");
      return null;
    }

    /* ======================================================
       2. Validate status transition
    ====================================================== */
    const allowed = VALID_TRANSITIONS[existing.status as BookingStatus] || [];
    if (!allowed.includes(newStatus)) {
      await client.query("ROLLBACK");
      throw new Error(
        `Invalid status transition from ${existing.status} to ${newStatus}`
      );
    }

    /* ======================================================
       3. Build update query
    ====================================================== */
    const { cancellation_reason, provider_notes } = options;

    const setParts: string[] = ["status = $1"];
    const values: any[] = [newStatus];
    let index = 2;

    if (cancellation_reason !== undefined) {
      setParts.push(`cancellation_reason = $${index++}`);
      values.push(cancellation_reason);
    }

    if (provider_notes !== undefined) {
      setParts.push(`provider_notes = $${index++}`);
      values.push(provider_notes);
    }

    if (newStatus === "accepted") {
      setParts.push(`accepted_at = CURRENT_TIMESTAMP`);
    }

    if (newStatus === "in_progress") {
      setParts.push(`started_at = CURRENT_TIMESTAMP`);
    }

    if (newStatus === "completed") {
      setParts.push(`completed_at = CURRENT_TIMESTAMP`);
      setParts.push(`payment_status = 'paid'`);
    }

    if (newStatus === "cancelled") {
      setParts.push(`cancelled_at = CURRENT_TIMESTAMP`);
    }

    const query = `
      UPDATE bookings
      SET ${setParts.join(", ")}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${index}
      RETURNING *
    `;
    values.push(id);

    /* ======================================================
       4. Execute update
    ====================================================== */
    const res = await client.query<Booking>(query, values);
    const updated = res.rows[0] || null;

    if (!updated) {
      await client.query("ROLLBACK");
      return null;
    }

    /* ======================================================
       5. Create earnings on COMPLETED
    ====================================================== */
    if (updated && newStatus === "completed") {
      try {
        const existingCheck = await client.query(
          `SELECT id FROM earnings WHERE booking_id = $1`,
          [updated.id]
        );

        if (existingCheck.rows.length === 0) {
          const earningsResult = await client.query(
            `
            INSERT INTO earnings (provider_id, booking_id, amount, commission, net_amount)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id
            `,
            [
              updated.provider_id,
              updated.id,
              Number(updated.subtotal),
              Number(updated.commission_amount),
              Number(updated.provider_earnings)
            ]
          );
        }
      } catch (earningsError) {
        // Continue with commit - don't rollback booking completion
      }
    }

    await client.query("COMMIT");
    return updated;
    
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export type ProviderBookingDetails = Booking & {
  customer: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    phone: string | null;
    profile_image: string | null;
  };
  service: {
    id: string;
    title: string;
    description: string;
    base_price: string;
    duration_minutes: number | null;
    images: any; // JSONB from Postgres (array)
    category_id: string;
  };
  address: null | {
    id: string;
    label: string | null;
    street_address: string;
    city: string;
    state: string | null;
    postal_code: string | null;
    country: string;
    latitude: string | null;  // DECIMAL -> string
    longitude: string | null; // DECIMAL -> string
    is_default: boolean;
  };
  booking_addons: Array<{
    id: string;
    addon_id: string;
    addon_name: string;
    addon_price: string;
    quantity: number;
  }>;
};

export async function listProviderBookingsDetailed(
  providerId: string
): Promise<ProviderBookingDetails[]> {
  const result = await pool.query<ProviderBookingDetails>(
    `
    SELECT
      b.*,

      json_build_object(
        'id', c.id,
        'first_name', c.first_name,
        'last_name', c.last_name,
        'email', c.email,
        'phone', c.phone,
        'profile_image', c.profile_image
      ) AS customer,

      json_build_object(
        'id', s.id,
        'title', s.title,
        'description', s.description,
        'base_price', s.base_price,
        'duration_minutes', s.duration_minutes,
        'images', s.images,
        'category_id', s.category_id
      ) AS service,

      CASE
        WHEN a.id IS NULL THEN NULL
        ELSE json_build_object(
          'id', a.id,
          'label', a.label,
          'street_address', a.street_address,
          'city', a.city,
          'state', a.state,
          'postal_code', a.postal_code,
          'country', a.country,
          'latitude', a.latitude,
          'longitude', a.longitude,
          'is_default', a.is_default
        )
      END AS address,

      COALESCE(
        json_agg(
          json_build_object(
            'id', ba.id,
            'addon_id', ba.addon_id,
            'addon_name', ba.addon_name,
            'addon_price', ba.addon_price,
            'quantity', ba.quantity
          )
        ) FILTER (WHERE ba.id IS NOT NULL),
        '[]'::json
      ) AS booking_addons

    FROM bookings b
    JOIN users c ON c.id = b.customer_id
    JOIN services s ON s.id = b.service_id
    LEFT JOIN addresses a ON a.id = b.address_id
    LEFT JOIN booking_addons ba ON ba.booking_id = b.id

    WHERE b.provider_id = $1

    GROUP BY b.id, c.id, s.id, a.id
    ORDER BY b.created_at DESC
    `,
    [providerId]
  );

  return result.rows;
}

// Add this NEW function for admin only - with filtering support
export async function listAllBookingsForAdmin(params?: {
  from?: string;
  to?: string;
  status?: string;
  searchQuery?: string;
}): Promise<any[]> {
  const { from, to, status, searchQuery } = params || {};
  
  let query = `
    SELECT
      b.*,
      
      -- service info
      s.title AS service_title,
      s.description AS service_description,
      s.images AS service_images,
      
      -- customer info
      c.first_name AS customer_first_name,
      c.last_name AS customer_last_name,
      c.email AS customer_email,
      c.phone AS customer_phone,
      c.profile_image AS customer_profile_image,
      
      -- provider info
      pu.first_name AS provider_first_name,
      pu.last_name AS provider_last_name,
      pu.email AS provider_email,
      pu.phone AS provider_phone,
      
      -- provider business info
      bp.business_name AS provider_business_name,
      bp.business_logo AS provider_business_logo,
      bp.business_phone AS provider_business_phone,
      bp.business_email AS provider_business_email,
      
      -- category info
      cat.name AS category_name,
      
      -- payment info from bookings table
      b.payment_status,
      b.payment_method
      -- If you have a separate payments table, add LEFT JOIN here

    FROM bookings b
    
    LEFT JOIN services s ON s.id = b.service_id
    LEFT JOIN users c ON c.id = b.customer_id
    LEFT JOIN users pu ON pu.id = b.provider_id
    LEFT JOIN business_profiles bp ON bp.user_id = b.provider_id
    LEFT JOIN categories cat ON cat.id = s.category_id
    
    WHERE 1=1
  `;
  
  const values: any[] = [];
  let paramIndex = 1;
  

// Date range filter
// if (from) {
//   query += ` AND b.created_at::date >= $${paramIndex}`;
//   values.push(from);
//   paramIndex++;
// }

// if (to) {
//   query += ` AND b.created_at::date <= $${paramIndex}`;
//   values.push(to);
//   paramIndex++;
// }

  // Status filter
  if (status && status !== 'all') {
    query += ` AND b.status = $${paramIndex}`;
    values.push(status);
    paramIndex++;
  }
  
  // Search filter
  if (searchQuery) {
    query += ` AND (
      b.booking_number ILIKE $${paramIndex} OR
      c.first_name ILIKE $${paramIndex} OR
      c.last_name ILIKE $${paramIndex} OR
      c.email ILIKE $${paramIndex} OR
      pu.first_name ILIKE $${paramIndex} OR
      pu.last_name ILIKE $${paramIndex} OR
      bp.business_name ILIKE $${paramIndex} OR
      s.title ILIKE $${paramIndex}
    )`;
    values.push(`%${searchQuery}%`);
    paramIndex++;
  }
  
  query += ` ORDER BY b.created_at DESC`;
  
  const res = await pool.query(query, values);
  
  return res.rows;
}