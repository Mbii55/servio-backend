// src/modules/availability/availability.routes.ts
import { Router } from "express";
import { auth } from "../../middleware/auth.middleware";
import {
  listMyAvailabilityHandler,
  createAvailabilityHandler,
  updateAvailabilityHandler,
  deleteAvailabilityHandler,
  listMyBlockedDatesHandler,
  createBlockedDateHandler,
  deleteBlockedDateHandler,
  getProviderSlotsForDateHandler,
} from "./availability.controller";

const router = Router();

// Provider availability (manage own schedule)
router.get("/", auth("provider"), listMyAvailabilityHandler);
router.post("/", auth("provider"), createAvailabilityHandler);
router.patch("/:id", auth("provider"), updateAvailabilityHandler);
router.delete("/:id", auth("provider"), deleteAvailabilityHandler);

// Provider blocked dates (holidays/time off)
router.get("/blocked-dates", auth("provider"), listMyBlockedDatesHandler);
router.post("/blocked-dates", auth("provider"), createBlockedDateHandler);
router.delete("/blocked-dates/:id", auth("provider"), deleteBlockedDateHandler);

// Public: available slots for a provider on a specific date
// GET /api/v1/availability/provider/:providerId/slots?date=2025-12-25&stepMinutes=30
router.get("/provider/:providerId/slots", getProviderSlotsForDateHandler);

export default router;