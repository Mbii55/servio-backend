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