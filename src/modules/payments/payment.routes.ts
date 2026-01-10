// src/modules/payments/payment.routes.ts

import { Router } from "express";
import { auth } from "../../middleware/auth.middleware";
import {
  initiatePayment,
  validatePayment,
  noqoodyWebhook,
  getPaymentStatus,
  getTransactionDetails,
  refundPayment,
} from "./payment.controller";

const router = Router();

// Customer initiates payment for a booking
router.post("/initiate", auth("customer"), initiatePayment);

// Customer validates payment status (manual check)
router.get("/validate/:transactionReference", auth("customer"), validatePayment);

// Get payment status for a booking
router.get("/booking/:bookingId/status", auth(null), getPaymentStatus);

// Noqoody webhook/callback (no auth - external service)
router.post("/webhook/noqoody", noqoodyWebhook);

// Admin routes
router.get("/transaction/:transactionId", auth("admin"), getTransactionDetails);
router.post("/transaction/:transactionId/refund", auth("admin"), refundPayment);

export default router;