// src/modules/payments/payment.repository.ts

import pool from "../../config/database";
import {
  PaymentTransaction,
  CreatePaymentTransactionParams,
  PaymentTransactionStatus,
  RefundPaymentParams,
  PaymentLog,
} from "./payment.types";

/**
 * Create a new payment transaction
 */
export async function createPaymentTransaction(
  params: CreatePaymentTransactionParams
): Promise<PaymentTransaction> {
  const {
    bookingId,
    provider,
    amount,
    currency = 'QAR',
    returnUrl,
    cancelUrl,
    callbackUrl,
    customerIp,
    userAgent,
  } = params;

  // Set expiration time (30 minutes from now)
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

  const result = await pool.query(
    `
    INSERT INTO payment_transactions (
      booking_id,
      provider,
      amount,
      currency,
      return_url,
      cancel_url,
      callback_url,
      customer_ip,
      user_agent,
      expires_at,
      status
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'pending')
    RETURNING *
    `,
    [
      bookingId,
      provider,
      amount,
      currency,
      returnUrl,
      cancelUrl,
      callbackUrl,
      customerIp,
      userAgent,
      expiresAt,
    ]
  );

  return result.rows[0];
}

/**
 * Get payment transaction by ID
 */
export async function getPaymentTransactionById(
  transactionId: string
): Promise<PaymentTransaction | null> {
  const result = await pool.query(
    `SELECT * FROM payment_transactions WHERE id = $1`,
    [transactionId]
  );

  return result.rows[0] || null;
}

/**
 * Get payment transaction by reference
 */
export async function getPaymentTransactionByReference(
  reference: string
): Promise<PaymentTransaction | null> {
  const result = await pool.query(
    `SELECT * FROM payment_transactions WHERE transaction_reference = $1`,
    [reference]
  );

  return result.rows[0] || null;
}

/**
 * Get payment transaction by booking ID
 */
export async function getPaymentTransactionByBookingId(
  bookingId: string
): Promise<PaymentTransaction | null> {
  const result = await pool.query(
    `
    SELECT * FROM payment_transactions 
    WHERE booking_id = $1 
    ORDER BY created_at DESC 
    LIMIT 1
    `,
    [bookingId]
  );

  return result.rows[0] || null;
}

/**
 * Update payment transaction with gateway response
 */
export async function updatePaymentGatewayData(params: {
  transactionId: string;
  gatewayTransactionId?: string;
  gatewayOrderId?: string;
  paymentUrl?: string;
  requestPayload?: any;
  responsePayload?: any;
}): Promise<PaymentTransaction | null> {
  const {
    transactionId,
    gatewayTransactionId,
    gatewayOrderId,
    paymentUrl,
    requestPayload,
    responsePayload,
  } = params;

  const result = await pool.query(
    `
    UPDATE payment_transactions
    SET
      gateway_transaction_id = COALESCE($2, gateway_transaction_id),
      gateway_order_id = COALESCE($3, gateway_order_id),
      payment_url = COALESCE($4, payment_url),
      gateway_request_payload = COALESCE($5, gateway_request_payload),
      gateway_response_payload = COALESCE($6, gateway_response_payload),
      status = CASE WHEN $4 IS NOT NULL THEN 'processing'::payment_transaction_status ELSE status END
    WHERE id = $1
    RETURNING *
    `,
    [
      transactionId,
      gatewayTransactionId,
      gatewayOrderId,
      paymentUrl,
      requestPayload ? JSON.stringify(requestPayload) : null,
      responsePayload ? JSON.stringify(responsePayload) : null,
    ]
  );

  return result.rows[0] || null;
}

/**
 * Update payment transaction status
 */
export async function updatePaymentStatus(params: {
  transactionId: string;
  status: PaymentTransactionStatus;
  gatewayTransactionId?: string;
  callbackPayload?: any;
  errorCode?: string;
  errorMessage?: string;
}): Promise<PaymentTransaction | null> {
  const {
    transactionId,
    status,
    gatewayTransactionId,
    callbackPayload,
    errorCode,
    errorMessage,
  } = params;

  const timestampField = 
    status === 'completed' ? 'completed_at' :
    status === 'failed' ? 'failed_at' :
    status === 'refunded' ? 'refunded_at' : null;

  const timestampClause = timestampField ? `${timestampField} = CURRENT_TIMESTAMP,` : '';

  const result = await pool.query(
    `
    UPDATE payment_transactions
    SET
      status = $2,
      gateway_transaction_id = COALESCE($3, gateway_transaction_id),
      gateway_callback_payload = COALESCE($4, gateway_callback_payload),
      error_code = $5,
      error_message = $6,
      ${timestampClause}
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
    RETURNING *
    `,
    [
      transactionId,
      status,
      gatewayTransactionId,
      callbackPayload ? JSON.stringify(callbackPayload) : null,
      errorCode,
      errorMessage,
    ]
  );

  return result.rows[0] || null;
}

/**
 * Process refund
 */
export async function processRefund(
  params: RefundPaymentParams
): Promise<PaymentTransaction | null> {
  const { transactionId, amount, reason, refundedBy } = params;

  const result = await pool.query(
    `
    UPDATE payment_transactions
    SET
      status = 'refunded'::payment_transaction_status,
      refund_amount = $2,
      refund_reason = $3,
      refunded_by = $4,
      refunded_at = CURRENT_TIMESTAMP,
      updated_at = CURRENT_TIMESTAMP
    WHERE id = $1 AND status = 'completed'
    RETURNING *
    `,
    [transactionId, amount, reason, refundedBy]
  );

  return result.rows[0] || null;
}

/**
 * Get all payment transactions for a booking
 */
export async function getBookingPaymentHistory(
  bookingId: string
): Promise<PaymentTransaction[]> {
  const result = await pool.query(
    `
    SELECT * FROM payment_transactions
    WHERE booking_id = $1
    ORDER BY created_at DESC
    `,
    [bookingId]
  );

  return result.rows;
}

/**
 * Create payment log entry
 */
export async function createPaymentLog(params: {
  paymentTransactionId: string;
  logType: PaymentLog['log_type'];
  message?: string;
  data?: any;
}): Promise<void> {
  const { paymentTransactionId, logType, message, data } = params;

  await pool.query(
    `
    INSERT INTO payment_logs (payment_transaction_id, log_type, message, data)
    VALUES ($1, $2, $3, $4)
    `,
    [
      paymentTransactionId,
      logType,
      message,
      data ? JSON.stringify(data) : null,
    ]
  );
}

/**
 * Get payment logs for a transaction
 */
export async function getPaymentLogs(
  transactionId: string
): Promise<PaymentLog[]> {
  const result = await pool.query(
    `
    SELECT * FROM payment_logs
    WHERE payment_transaction_id = $1
    ORDER BY created_at DESC
    `,
    [transactionId]
  );

  return result.rows;
}

/**
 * Mark expired payments
 * Run this periodically (e.g., via cron job)
 */
export async function markExpiredPayments(): Promise<number> {
  const result = await pool.query(
    `
    UPDATE payment_transactions
    SET status = 'expired'::payment_transaction_status
    WHERE status = 'pending' 
      AND expires_at < CURRENT_TIMESTAMP
    RETURNING id
    `
  );

  return result.rowCount || 0;
}

/**
 * Get payment statistics for admin dashboard
 */
export async function getPaymentStatistics(params: {
  from?: string;
  to?: string;
}): Promise<{
  total_transactions: number;
  total_amount: number;
  completed_transactions: number;
  completed_amount: number;
  failed_transactions: number;
  pending_transactions: number;
  refunded_transactions: number;
  refunded_amount: number;
}> {
  const { from, to } = params;
  
  const whereClauses: string[] = [];
  const queryParams: any[] = [];

  if (from) {
    queryParams.push(from);
    whereClauses.push(`created_at >= $${queryParams.length}`);
  }

  if (to) {
    queryParams.push(to);
    whereClauses.push(`created_at <= $${queryParams.length}`);
  }

  const whereClause = whereClauses.length > 0 
    ? `WHERE ${whereClauses.join(' AND ')}`
    : '';

  const result = await pool.query(
    `
    SELECT
      COUNT(*)::INTEGER AS total_transactions,
      COALESCE(SUM(amount), 0) AS total_amount,
      COUNT(*) FILTER (WHERE status = 'completed')::INTEGER AS completed_transactions,
      COALESCE(SUM(amount) FILTER (WHERE status = 'completed'), 0) AS completed_amount,
      COUNT(*) FILTER (WHERE status = 'failed')::INTEGER AS failed_transactions,
      COUNT(*) FILTER (WHERE status = 'pending')::INTEGER AS pending_transactions,
      COUNT(*) FILTER (WHERE status = 'refunded')::INTEGER AS refunded_transactions,
      COALESCE(SUM(refund_amount) FILTER (WHERE status = 'refunded'), 0) AS refunded_amount
    FROM payment_transactions
    ${whereClause}
    `,
    queryParams
  );

  return result.rows[0];
}

/**
 * Get payment transactions list (admin)
 */
export async function getPaymentTransactionsList(params: {
  limit?: number;
  offset?: number;
  status?: PaymentTransactionStatus;
  provider?: 'cash' | 'noqoody';
}): Promise<PaymentTransaction[]> {
  const { limit = 50, offset = 0, status, provider } = params;

  const whereClauses: string[] = [];
  const queryParams: any[] = [];

  if (status) {
    queryParams.push(status);
    whereClauses.push(`status = $${queryParams.length}`);
  }

  if (provider) {
    queryParams.push(provider);
    whereClauses.push(`provider = $${queryParams.length}`);
  }

  const whereClause = whereClauses.length > 0 
    ? `WHERE ${whereClauses.join(' AND ')}`
    : '';

  queryParams.push(limit);
  queryParams.push(offset);

  const result = await pool.query(
    `
    SELECT 
      pt.*,
      b.booking_number,
      u.first_name || ' ' || u.last_name as customer_name
    FROM payment_transactions pt
    LEFT JOIN bookings b ON b.id = pt.booking_id
    LEFT JOIN users u ON u.id = b.customer_id
    ${whereClause}
    ORDER BY pt.created_at DESC
    LIMIT $${queryParams.length - 1} OFFSET $${queryParams.length}
    `,
    queryParams
  );

  return result.rows;
}

// src/modules/bookings/booking.repository.ts - ADD THIS FUNCTION

/**
 * ✅ NEW: Create booking after successful payment
 * Used by payment validation flow
 */
export async function createBookingForPayment(params: {
  customerId: string;
  serviceId: string;
  scheduledDate: string;
  scheduledTime: string;
  addressId?: string;
  addons?: Array<{ addon_id: string; quantity?: number }>;
  customerNotes?: string;
  paymentMethod: 'noqoody';
  paymentTransactionId: string;
}): Promise<any> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    // 1️⃣ Fetch service
    const serviceResult = await client.query(
      `SELECT id, provider_id, base_price, title, is_active
       FROM services
       WHERE id = $1
       LIMIT 1`,
      [params.serviceId]
    );

    if (serviceResult.rows.length === 0) {
      throw new Error("Service not found");
    }

    const service = serviceResult.rows[0];
    const providerId = service.provider_id;

    if (service.is_active === false) {
      throw new Error("This service is currently unavailable.");
    }

    const servicePrice = Number(service.base_price);
    if (!Number.isFinite(servicePrice) || servicePrice < 0) {
      throw new Error("Invalid service price");
    }

    // 2️⃣ Check provider verification
    const verificationCheck = await client.query(
      `SELECT verification_status FROM business_profiles WHERE user_id = $1 LIMIT 1`,
      [providerId]
    );

    if (verificationCheck.rows.length === 0) {
      throw new Error("Provider business profile not found");
    }

    if (verificationCheck.rows[0].verification_status !== "approved") {
      throw new Error("This provider is not yet verified.");
    }

    // 3️⃣ Get commission rate
    const commissionResult = await client.query(
      `SELECT commission_rate FROM business_profiles WHERE user_id = $1 LIMIT 1`,
      [providerId]
    );

    const commissionRate = commissionResult.rows[0]?.commission_rate
      ? Number(commissionResult.rows[0].commission_rate)
      : 15.0;

    if (!Number.isFinite(commissionRate) || commissionRate < 0) {
      throw new Error("Invalid commission rate");
    }

    // 4️⃣ Handle addons
    let addonsPrice = 0;
    const addonRecords: Array<{
      addon_id: string;
      addon_name: string;
      addon_price: string;
      quantity: number;
    }> = [];

    if (params.addons && params.addons.length > 0) {
      const addonIds = params.addons.map((a) => a.addon_id);

      const addonResult = await client.query(
        `
        SELECT id, name, price
        FROM service_addons
        WHERE service_id = $1
          AND id = ANY($2::uuid[])
        `,
        [params.serviceId, addonIds]
      );

      for (const addonRow of addonResult.rows) {
        const inputAddon = params.addons.find((a) => a.addon_id === addonRow.id);
        const quantity = Math.max(1, Number(inputAddon?.quantity ?? 1));

        const price = Number(addonRow.price);
        if (!Number.isFinite(price) || price < 0) continue;

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
    const subtotal = Number((servicePrice + addonsPrice).toFixed(2));
    const commissionAmount = Number(((subtotal * commissionRate) / 100).toFixed(2));
    const providerEarnings = Number((subtotal - commissionAmount).toFixed(2));

    // 6️⃣ Insert booking (with payment_transaction_id)
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
        customer_notes,
        payment_transaction_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING *
      `,
      [
        params.customerId,
        providerId,
        params.serviceId,
        params.addressId || null,
        params.scheduledDate,
        params.scheduledTime,
        "pending",
        params.paymentMethod,
        "paid", // ✅ Payment already completed
        servicePrice,
        addonsPrice,
        subtotal,
        commissionRate,
        commissionAmount,
        providerEarnings,
        params.customerNotes || null,
        params.paymentTransactionId,
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

    return {
      ...booking,
      provider_id: providerId,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}