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
  createBookingForPayment
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

    // ✅ NEW: Accept booking data instead of bookingId
    const { 
      service_id,
      scheduled_date,
      scheduled_time,
      address_id,
      addons,
      customer_notes,
    } = req.body;

    if (!service_id || !scheduled_date || !scheduled_time) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    // Get service to calculate amount
    const service = await pool.query(
      `SELECT s.*, bp.commission_rate 
       FROM services s
       LEFT JOIN business_profiles bp ON bp.user_id = s.provider_id
       WHERE s.id = $1`,
      [service_id]
    );

    if (service.rows.length === 0) {
      return res.status(404).json({ error: "Service not found" });
    }

    const serviceData = service.rows[0];
    const servicePrice = Number(serviceData.base_price);

    // Calculate addons price
    let addonsPrice = 0;
    if (addons && addons.length > 0) {
      const addonIds = addons.map((a: any) => a.addon_id);
      const addonResult = await pool.query(
        `SELECT id, price FROM service_addons WHERE service_id = $1 AND id = ANY($2::uuid[])`,
        [service_id, addonIds]
      );

      for (const addonRow of addonResult.rows) {
        const quantity = addons.find((a: any) => a.addon_id === addonRow.id)?.quantity || 1;
        addonsPrice += Number(addonRow.price) * quantity;
      }
    }

    const totalAmount = servicePrice + addonsPrice;

    // Get customer details
    const customerResult = await pool.query(
      `SELECT id, first_name, last_name, email, phone FROM users WHERE id = $1`,
      [user.userId]
    );

    if (customerResult.rows.length === 0) {
      return res.status(404).json({ error: "Customer not found" });
    }

    const customer = customerResult.rows[0];
    const customerName = `${customer.first_name} ${customer.last_name}`;
    const customerEmail = customer.email;
    const customerMobile = customer.phone || '';

    if (!customerEmail || !customerMobile) {
      return res.status(400).json({ 
        error: "Customer email and phone are required for payment. Please update your profile." 
      });
    }

    const customerIp = req.ip || req.headers['x-forwarded-for'] as string || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';

    const returnUrl = `${process.env.MOBILE_APP_URL || 'servio://payment'}/success`;
    const cancelUrl = `${process.env.MOBILE_APP_URL || 'servio://payment'}/cancel`;
    const callbackUrl = `${process.env.API_URL || 'http://localhost:5000'}/api/v1/payments/webhook/noqoody`;

    // ✅ Create payment transaction WITHOUT booking_id
    const transaction = await pool.query(
      `
      INSERT INTO payment_transactions (
        provider,
        amount,
        currency,
        return_url,
        cancel_url,
        callback_url,
        customer_ip,
        user_agent,
        expires_at,
        status,
        gateway_request_payload
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending', $10)
      RETURNING *
      `,
      [
        'noqoody',
        totalAmount,
        'QAR',
        returnUrl,
        cancelUrl,
        callbackUrl,
        customerIp,
        userAgent,
        new Date(Date.now() + 30 * 60 * 1000), // 30 min expiry
        JSON.stringify({
          service_id,
          scheduled_date,
          scheduled_time,
          address_id,
          addons,
          customer_notes,
          customer_id: user.userId,
        })
      ]
    );

    const paymentTransaction = transaction.rows[0];

    await createPaymentLog({
      paymentTransactionId: paymentTransaction.id,
      logType: 'request',
      message: 'Payment transaction created (pre-booking)',
      data: { service_id, amount: totalAmount },
    });

    // Call Noqoody API
    try {
      const noqoodyResponse = await noqoodyService.generatePaymentLink({
        amount: totalAmount,
        customerEmail: customerEmail,
        customerMobile: customerMobile,
        customerName: customerName,
        description: `Service: ${serviceData.title}`,
        reference: paymentTransaction.transaction_reference,
      });

      await updatePaymentGatewayData({
        transactionId: paymentTransaction.id,
        gatewayTransactionId: noqoodyResponse.Uuid,
        gatewayOrderId: noqoodyResponse.SessionId,
        paymentUrl: noqoodyResponse.PaymentUrl,
        requestPayload: {
          reference: paymentTransaction.transaction_reference,
          amount: totalAmount,
          customerName,
          customerEmail,
          customerMobile,
        },
        responsePayload: noqoodyResponse,
      });

      await createPaymentLog({
        paymentTransactionId: paymentTransaction.id,
        logType: 'response',
        message: 'Noqoody payment link generated',
        data: { paymentUrl: noqoodyResponse.PaymentUrl },
      });

      return res.json({
        success: true,
        transactionId: paymentTransaction.id,
        transactionReference: paymentTransaction.transaction_reference,
        paymentUrl: noqoodyResponse.PaymentUrl,
        sessionId: noqoodyResponse.SessionId,
        uuid: noqoodyResponse.Uuid,
        message: "Payment initiated successfully",
      });

    } catch (noqoodyError: any) {
      await createPaymentLog({
        paymentTransactionId: paymentTransaction.id,
        logType: 'error',
        message: 'Noqoody API error',
        data: { error: noqoodyError.message },
      });

      await updatePaymentStatus({
        transactionId: paymentTransaction.id,
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

    const transaction = await getPaymentTransactionByReference(transactionReference);
    if (!transaction) {
      return res.status(404).json({ error: "Transaction not found" });
    }

    // Verify ownership (check customer_id in gateway_request_payload)
    const requestPayload = transaction.gateway_request_payload;
    if (requestPayload?.customer_id !== user.userId) {
      return res.status(403).json({ error: "Not authorized" });
    }

    // If already completed and booking exists, return success
    if (transaction.status === 'completed' && transaction.booking_id) {
      return res.json({
        success: true,
        status: 'completed',
        message: 'Payment already completed',
        bookingId: transaction.booking_id,
      });
    }

    // Call Noqoody to validate
    try {
      const validationResult = await noqoodyService.validatePayment(transactionReference);

      await createPaymentLog({
        paymentTransactionId: transaction.id,
        logType: 'response',
        message: 'Payment validation from Noqoody',
        data: validationResult,
      });

      const isSuccess = validationResult.success && validationResult.data?.Status === 'Paid';

      if (isSuccess) {
        // ✅ CREATE BOOKING NOW (after payment confirmed)
        const bookingData = requestPayload;
        
        const booking = await createBookingForPayment({
          customerId: bookingData.customer_id,
          serviceId: bookingData.service_id,
          scheduledDate: bookingData.scheduled_date,
          scheduledTime: bookingData.scheduled_time,
          addressId: bookingData.address_id,
          addons: bookingData.addons,
          customerNotes: bookingData.customer_notes,
          paymentMethod: 'noqoody',
          paymentTransactionId: transaction.id,
        });

        // Update transaction with booking_id
        await pool.query(
          `UPDATE payment_transactions SET booking_id = $1 WHERE id = $2`,
          [booking.id, transaction.id]
        );

        // Update payment status
        await updatePaymentStatus({
          transactionId: transaction.id,
          status: 'completed',
          callbackPayload: validationResult.data,
        });

        // Update booking payment status
        await updateBookingPaymentStatus(booking.id, 'paid');

        // Create earnings
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
          type: 'booking_created',
          title: 'New Paid Booking',
          message: `New booking ${booking.booking_number} with payment confirmed.`,
          data: { booking_id: booking.id },
        });

        await sendPushNotificationToUser({
          userId: booking.provider_id,
          title: 'New Paid Booking',
          body: `New booking ${booking.booking_number} received.`,
          data: { booking_id: booking.id, type: 'booking_created' },
        });

        return res.json({
          success: true,
          status: 'completed',
          message: 'Payment validated and booking created successfully',
          bookingId: booking.id,
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