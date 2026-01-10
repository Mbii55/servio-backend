// src/modules/payments/payment.controller.ts

import { Request, Response } from "express";
import { AuthPayload } from "../../middleware/auth.middleware";
import {
  createPaymentTransaction,
  getPaymentTransactionById,
  getPaymentTransactionByReference,
  updatePaymentGatewayData,
  updatePaymentStatus,
  createPaymentLog,
  processRefund,
  getPaymentTransactionByBookingId,
  getPaymentLogs,
} from "./payment.repository";
import { 
  getBookingById, 
  updateBookingPaymentStatus 
} from "../bookings/booking.repository";
import { createNotification } from "../notifications/notification.repository";
import { sendPushNotificationToUser } from "../../utils/expo-push.service";
import { createEarningsForBooking } from "../earnings/earnings.repository";
import noqoodyService from "../../services/noqoody.service";
import pool from "../../config/database";

/**
 * ✅ STEP 1: Initiate payment for a booking
 * Called when customer chooses to pay online
 */
export const initiatePayment = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as AuthPayload | undefined;
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { bookingId } = req.body;

    if (!bookingId) {
      return res.status(400).json({ error: "bookingId is required" });
    }

    // Get booking details
    const booking = await getBookingById(bookingId);
    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    // Verify user owns this booking
    if (booking.customer_id !== user.userId) {
      return res.status(403).json({ error: "Not authorized for this booking" });
    }

    // Check booking status
    if (booking.status !== "pending" && booking.status !== "accepted") {
      return res.status(400).json({ 
        error: "Booking must be pending or accepted to initiate payment" 
      });
    }

    // Check if payment already completed
    const existingTransaction = await getPaymentTransactionByBookingId(bookingId);
    if (existingTransaction && existingTransaction.status === "completed") {
      return res.status(400).json({ 
        error: "Payment already completed for this booking" 
      });
    }

    // ✅ Get customer details from users table
    const customerResult = await pool.query(
      `SELECT id, first_name, last_name, email, phone FROM users WHERE id = $1`,
      [booking.customer_id]
    );

    if (customerResult.rows.length === 0) {
      return res.status(404).json({ error: "Customer not found" });
    }

    const customer = customerResult.rows[0];
    const customerName = `${customer.first_name} ${customer.last_name}`;
    const customerEmail = customer.email;
    const customerMobile = customer.phone || '';

    // Validate required fields for Noqoody
    if (!customerEmail) {
      return res.status(400).json({ 
        error: "Customer email is required for payment. Please update your profile." 
      });
    }

    if (!customerMobile) {
      return res.status(400).json({ 
        error: "Customer phone number is required for payment. Please update your profile." 
      });
    }

    // Get customer IP and user agent
    const customerIp = req.ip || req.headers['x-forwarded-for'] as string || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    // Create frontend URLs (adjust based on your app structure)
    const returnUrl = `${process.env.MOBILE_APP_URL || 'servio://payment'}/success`;
    const cancelUrl = `${process.env.MOBILE_APP_URL || 'servio://payment'}/cancel`;
    const callbackUrl = `${process.env.API_URL || 'http://localhost:5000'}/api/v1/payments/webhook/noqoody`;

    // Create payment transaction record
    const transaction = await createPaymentTransaction({
      bookingId,
      provider: 'noqoody',
      amount: Number(booking.subtotal),
      currency: 'QAR',
      returnUrl,
      cancelUrl,
      callbackUrl,
      customerIp,
      userAgent,
    });

    // Log transaction creation
    await createPaymentLog({
      paymentTransactionId: transaction.id,
      logType: 'request',
      message: 'Payment transaction created',
      data: { bookingId, amount: booking.subtotal },
    });

    // ✅ Call Noqoody API to generate payment link
    try {
      const noqoodyResponse = await noqoodyService.generatePaymentLink({
        amount: Number(booking.subtotal),
        customerEmail: customerEmail,
        customerMobile: customerMobile,
        customerName: customerName,
        description: `Booking ${booking.booking_number}`,
        reference: transaction.transaction_reference,
      });

      // Log Noqoody request
      await createPaymentLog({
        paymentTransactionId: transaction.id,
        logType: 'request',
        message: 'Noqoody payment link request sent',
        data: noqoodyResponse,
      });

      // Update transaction with Noqoody response
      await updatePaymentGatewayData({
        transactionId: transaction.id,
        gatewayTransactionId: noqoodyResponse.Uuid,
        gatewayOrderId: noqoodyResponse.SessionId,
        paymentUrl: noqoodyResponse.PaymentUrl,
        requestPayload: {
          reference: transaction.transaction_reference,
          amount: booking.subtotal,
          customerName,
          customerEmail,
          customerMobile,
        },
        responsePayload: noqoodyResponse,
      });

      // Log success
      await createPaymentLog({
        paymentTransactionId: transaction.id,
        logType: 'response',
        message: 'Noqoody payment link generated successfully',
        data: { paymentUrl: noqoodyResponse.PaymentUrl },
      });

      return res.json({
        success: true,
        transactionId: transaction.id,
        transactionReference: transaction.transaction_reference,
        paymentUrl: noqoodyResponse.PaymentUrl,
        sessionId: noqoodyResponse.SessionId,
        uuid: noqoodyResponse.Uuid,
        message: "Payment initiated successfully",
      });

    } catch (noqoodyError: any) {
      // Log Noqoody error
      await createPaymentLog({
        paymentTransactionId: transaction.id,
        logType: 'error',
        message: 'Noqoody API error',
        data: { error: noqoodyError.message },
      });

      // Update transaction as failed
      await updatePaymentStatus({
        transactionId: transaction.id,
        status: 'failed',
        errorCode: 'NOQOODY_ERROR',
        errorMessage: noqoodyError.message,
      });

      return res.status(500).json({ 
        error: "Failed to generate payment link",
        message: noqoodyError.message,
      });
    }

  } catch (error: any) {
    console.error("initiatePayment error:", error);
    return res.status(500).json({ error: "Server error" });
  }
};

/**
 * ✅ STEP 2: Validate payment manually (optional - for polling)
 * Customer can call this to check payment status
 */
export const validatePayment = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as AuthPayload | undefined;
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { transactionReference } = req.params;

    // Get transaction from database
    const transaction = await getPaymentTransactionByReference(transactionReference);
    if (!transaction) {
      return res.status(404).json({ error: "Transaction not found" });
    }

    // Get booking to verify ownership
    const booking = await getBookingById(transaction.booking_id);
    if (!booking || booking.customer_id !== user.userId) {
      return res.status(403).json({ error: "Not authorized" });
    }

    // If already completed, return status
    if (transaction.status === 'completed') {
      return res.json({
        success: true,
        status: 'completed',
        message: 'Payment already completed',
      });
    }

    // Call Noqoody to validate payment
    try {
      const validationResult = await noqoodyService.validatePayment(transactionReference);

      // Log validation
      await createPaymentLog({
        paymentTransactionId: transaction.id,
        logType: 'response',
        message: 'Payment validation from Noqoody',
        data: validationResult,
      });

      // Check if payment was successful
      // Note: You'll need to adjust this based on actual Noqoody response structure
      const isSuccess = validationResult.success && validationResult.data?.Status === 'Paid';

      if (isSuccess) {
        // Update payment status to completed
        await updatePaymentStatus({
          transactionId: transaction.id,
          status: 'completed',
          callbackPayload: validationResult.data,
        });

        // Update booking payment status
        await updateBookingPaymentStatus(transaction.booking_id, 'paid');

        // Create earnings record
        await createEarningsForBooking({
          providerId: booking.provider_id,
          bookingId: booking.id,
          amount: Number(booking.subtotal),
          commission: Number(booking.commission_amount),
          netAmount: Number(booking.provider_earnings),
        });

        // Send notifications
        await createNotification({
          user_id: booking.customer_id,
          type: 'payment_received',
          title: 'Payment Successful',
          message: `Your payment of ${booking.subtotal} QAR for booking ${booking.booking_number} was successful.`,
          data: { booking_id: booking.id },
        });

        await sendPushNotificationToUser({
          userId: booking.customer_id,
          title: 'Payment Successful',
          body: `Your payment of ${booking.subtotal} QAR was successful.`,
          data: { booking_id: booking.id, type: 'payment_success' },
        });

        await createNotification({
          user_id: booking.provider_id,
          type: 'payment_received',
          title: 'Payment Received',
          message: `Payment of ${booking.subtotal} QAR received for booking ${booking.booking_number}.`,
          data: { booking_id: booking.id },
        });

        await sendPushNotificationToUser({
          userId: booking.provider_id,
          title: 'Payment Received',
          body: `Payment of ${booking.subtotal} QAR received.`,
          data: { booking_id: booking.id, type: 'payment_received' },
        });

        return res.json({
          success: true,
          status: 'completed',
          message: 'Payment validated and completed successfully',
        });
      } else {
        return res.json({
          success: false,
          status: transaction.status,
          message: 'Payment not yet completed',
        });
      }

    } catch (validationError: any) {
      await createPaymentLog({
        paymentTransactionId: transaction.id,
        logType: 'error',
        message: 'Payment validation error',
        data: { error: validationError.message },
      });

      return res.status(500).json({ 
        error: "Failed to validate payment",
        message: validationError.message,
      });
    }

  } catch (error: any) {
    console.error("validatePayment error:", error);
    return res.status(500).json({ error: "Server error" });
  }
};

/**
 * ✅ STEP 3: Noqoody webhook handler (if Noqoody supports webhooks)
 * This would be called automatically by Noqoody when payment status changes
 * Note: Based on the docs, Noqoody might not have webhooks - validation is done via polling
 */
export const noqoodyWebhook = async (req: Request, res: Response) => {
  try {
    const callbackData = req.body;

    console.log("Noqoody webhook/callback received:", callbackData);

    // Log the callback
    const transactionReference = callbackData.Reference || callbackData.reference;
    
    if (!transactionReference) {
      console.error("No transaction reference in webhook");
      return res.status(400).json({ error: "Invalid webhook data" });
    }

    const transaction = await getPaymentTransactionByReference(transactionReference);
    
    if (!transaction) {
      console.error("Transaction not found:", transactionReference);
      return res.status(404).json({ error: "Transaction not found" });
    }

    // Log callback
    await createPaymentLog({
      paymentTransactionId: transaction.id,
      logType: 'callback',
      message: 'Noqoody callback received',
      data: callbackData,
    });

    // Determine payment status based on callback data
    // Adjust this based on actual Noqoody callback structure
    const paymentStatus = callbackData.Status === 'Paid' || callbackData.status === 'success' 
      ? 'completed' 
      : 'failed';

    // Update payment transaction
    await updatePaymentStatus({
      transactionId: transaction.id,
      status: paymentStatus,
      callbackPayload: callbackData,
    });

    // If payment completed, update booking and create earnings
    if (paymentStatus === 'completed') {
      const booking = await getBookingById(transaction.booking_id);
      
      if (booking) {
        await updateBookingPaymentStatus(transaction.booking_id, 'paid');

        await createEarningsForBooking({
          providerId: booking.provider_id,
          bookingId: booking.id,
          amount: Number(booking.subtotal),
          commission: Number(booking.commission_amount),
          netAmount: Number(booking.provider_earnings),
        });

        // Send notifications (same as in validatePayment)
        await createNotification({
          user_id: booking.customer_id,
          type: 'payment_received',
          title: 'Payment Successful',
          message: `Your payment of ${booking.subtotal} QAR for booking ${booking.booking_number} was successful.`,
          data: { booking_id: booking.id },
        });

        await sendPushNotificationToUser({
          userId: booking.customer_id,
          title: 'Payment Successful',
          body: `Your payment of ${booking.subtotal} QAR was successful.`,
          data: { booking_id: booking.id, type: 'payment_success' },
        });

        await createNotification({
          user_id: booking.provider_id,
          type: 'payment_received',
          title: 'Payment Received',
          message: `Payment of ${booking.subtotal} QAR received for booking ${booking.booking_number}.`,
          data: { booking_id: booking.id },
        });

        await sendPushNotificationToUser({
          userId: booking.provider_id,
          title: 'Payment Received',
          body: `Payment of ${booking.subtotal} QAR received.`,
          data: { booking_id: booking.id, type: 'payment_received' },
        });
      }
    }

    return res.json({ success: true, message: "Callback processed" });

  } catch (error) {
    console.error("noqoodyWebhook error:", error);
    return res.status(500).json({ error: "Server error" });
  }
};

/**
 * Get payment status for a booking
 */
export const getPaymentStatus = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as AuthPayload | undefined;
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { bookingId } = req.params;

    const booking = await getBookingById(bookingId);
    if (!booking) {
      return res.status(404).json({ error: "Booking not found" });
    }

    // Verify user has access
    if (booking.customer_id !== user.userId && booking.provider_id !== user.userId) {
      return res.status(403).json({ error: "Not authorized" });
    }

    const transaction = await getPaymentTransactionByBookingId(bookingId);

    if (!transaction) {
      return res.json({
        hasPayment: false,
        paymentMethod: booking.payment_method,
        paymentStatus: booking.payment_status,
      });
    }

    return res.json({
      hasPayment: true,
      transaction: {
        id: transaction.id,
        reference: transaction.transaction_reference,
        provider: transaction.provider,
        amount: transaction.amount,
        currency: transaction.currency,
        status: transaction.status,
        paymentUrl: transaction.payment_url,
        createdAt: transaction.created_at,
        completedAt: transaction.completed_at,
      },
    });

  } catch (error) {
    console.error("getPaymentStatus error:", error);
    return res.status(500).json({ error: "Server error" });
  }
};

/**
 * Get payment transaction details (admin only)
 */
export const getTransactionDetails = async (req: Request, res: Response) => {
  try {
    const { transactionId } = req.params;

    const transaction = await getPaymentTransactionById(transactionId);
    if (!transaction) {
      return res.status(404).json({ error: "Transaction not found" });
    }

    const logs = await getPaymentLogs(transactionId);

    return res.json({
      transaction,
      logs,
    });

  } catch (error) {
    console.error("getTransactionDetails error:", error);
    return res.status(500).json({ error: "Server error" });
  }
};

/**
 * Refund a payment (admin only)
 */
export const refundPayment = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as AuthPayload | undefined;
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { transactionId } = req.params;
    const { amount, reason } = req.body;

    const transaction = await getPaymentTransactionById(transactionId);
    if (!transaction) {
      return res.status(404).json({ error: "Transaction not found" });
    }

    if (transaction.status !== 'completed') {
      return res.status(400).json({ 
        error: "Can only refund completed transactions" 
      });
    }

    // Note: Noqoody might not have a refund API
    // This would need to be done manually through their dashboard
    // For now, we'll just mark it as refunded in our system

    const refunded = await processRefund({
      transactionId,
      amount: amount || Number(transaction.amount),
      reason,
      refundedBy: user.userId,
    });

    if (!refunded) {
      return res.status(500).json({ error: "Failed to process refund" });
    }

    await updateBookingPaymentStatus(transaction.booking_id, 'refunded');

    await createPaymentLog({
      paymentTransactionId: transactionId,
      logType: 'status_change',
      message: 'Payment refunded (manual)',
      data: { amount, reason, refundedBy: user.userId },
    });

    return res.json({
      success: true,
      message: "Refund processed successfully",
      transaction: refunded,
    });

  } catch (error) {
    console.error("refundPayment error:", error);
    return res.status(500).json({ error: "Server error" });
  }
};