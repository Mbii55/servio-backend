// src/modules/bookings/booking.routes.ts
import { Router } from "express";
import {
  createBookingHandler,
  listMyBookingsHandler,
  getBookingHandler,
  updateBookingStatusHandler,
  listProviderBookingsDetailedHandler
} from "./booking.controller";
import { auth } from "../../middleware/auth.middleware";

const router = Router();

// create booking (customer)
router.post("/", auth("customer"), createBookingHandler);

// list bookings for current user (customer/provider/admin)
router.get("/me", auth(), listMyBookingsHandler);

// single booking
router.get("/:id", auth(), getBookingHandler);

// GET /api/v1/bookings/provider/detailed
router.get("/provider/detailed", auth("provider"), listProviderBookingsDetailedHandler);

// update status (provider/admin, or customer for cancel)
router.patch("/:id/status", auth(), updateBookingStatusHandler);

export default router;
