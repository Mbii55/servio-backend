// src/modules/availability/availability.controller.ts
import { Request, Response } from "express";
import {
  listAvailabilityForProvider,
  createAvailability,
  updateAvailability,
  deleteAvailability,
  listBlockedDatesForProvider,
  createBlockedDate,
  deleteBlockedDate,
  listAvailabilityForProviderOnDay,
  isProviderBlockedOnDate,
  listBookedTimesForDate,
} from "./availability.repository";
import {
  CreateAvailabilityInput,
  UpdateAvailabilityInput,
  CreateBlockedDateInput,
  DayOfWeek,
} from "./availability.types";
import { AuthPayload } from "../../middleware/auth.middleware";

// helper: map JS day (0=Sun) → DB enum
function mapJsDayToEnum(day: number): DayOfWeek {
  const map: Record<number, DayOfWeek> = {
    0: "sunday",
    1: "monday",
    2: "tuesday",
    3: "wednesday",
    4: "thursday",
    5: "friday",
    6: "saturday",
  };
  return map[day];
}

// helper: generate time slots between start/end at 30min steps
function generateSlots(start: string, end: string, stepMinutes = 30): string[] {
  const [startH, startM] = start.split(":").map(Number);
  const [endH, endM] = end.split(":").map(Number);

  let startTotal = startH * 60 + startM;
  const endTotal = endH * 60 + endM;

  const slots: string[] = [];
  while (startTotal + stepMinutes <= endTotal) {
    const h = Math.floor(startTotal / 60);
    const m = startTotal % 60;
    const hh = h.toString().padStart(2, "0");
    const mm = m.toString().padStart(2, "0");
    slots.push(`${hh}:${mm}`);
    startTotal += stepMinutes;
  }
  return slots;
}

// ---------------- Provider management ----------------

export const listMyAvailabilityHandler = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as AuthPayload | undefined;
    if (!user) return res.status(401).json({ message: "Unauthorized" });
    if (user.role !== "provider" && user.role !== "admin") {
      return res.status(403).json({ message: "Only providers can view this" });
    }

    const availability = await listAvailabilityForProvider(user.userId);
    return res.json(availability);
  } catch (err) {
    console.error("listMyAvailabilityHandler error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

export const createAvailabilityHandler = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as AuthPayload | undefined;
    if (!user) return res.status(401).json({ message: "Unauthorized" });
    if (user.role !== "provider" && user.role !== "admin") {
      return res.status(403).json({ message: "Only providers can edit availability" });
    }

    const body = req.body as Partial<CreateAvailabilityInput>;
    if (!body.day_of_week || !body.start_time || !body.end_time) {
      return res.status(400).json({
        message: "day_of_week, start_time, end_time are required",
      });
    }

    const availability = await createAvailability(user.userId, {
      day_of_week: body.day_of_week,
      start_time: body.start_time,
      end_time: body.end_time,
      is_available: body.is_available,
    });

    return res.status(201).json(availability);
  } catch (err) {
    console.error("createAvailabilityHandler error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

export const updateAvailabilityHandler = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as AuthPayload | undefined;
    if (!user) return res.status(401).json({ message: "Unauthorized" });
    if (user.role !== "provider" && user.role !== "admin") {
      return res.status(403).json({ message: "Only providers can edit availability" });
    }

    const { id } = req.params;
    const body = req.body as UpdateAvailabilityInput;

    const updated = await updateAvailability(id, user.userId, body);
    if (!updated) {
      return res.status(404).json({ message: "Availability slot not found" });
    }

    return res.json(updated);
  } catch (err) {
    console.error("updateAvailabilityHandler error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

export const deleteAvailabilityHandler = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as AuthPayload | undefined;
    if (!user) return res.status(401).json({ message: "Unauthorized" });
    if (user.role !== "provider" && user.role !== "admin") {
      return res.status(403).json({ message: "Only providers can edit availability" });
    }

    const { id } = req.params;
    const success = await deleteAvailability(id, user.userId);

    if (!success) {
      return res.status(404).json({ message: "Availability slot not found" });
    }

    return res.json({ message: "Availability slot deleted" });
  } catch (err) {
    console.error("deleteAvailabilityHandler error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ---------------- Blocked dates ----------------

export const listMyBlockedDatesHandler = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as AuthPayload | undefined;
    if (!user) return res.status(401).json({ message: "Unauthorized" });
    if (user.role !== "provider" && user.role !== "admin") {
      return res.status(403).json({ message: "Only providers can view this" });
    }

    const blocked = await listBlockedDatesForProvider(user.userId);
    return res.json(blocked);
  } catch (err) {
    console.error("listMyBlockedDatesHandler error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

export const createBlockedDateHandler = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as AuthPayload | undefined;
    if (!user) return res.status(401).json({ message: "Unauthorized" });
    if (user.role !== "provider" && user.role !== "admin") {
      return res.status(403).json({ message: "Only providers can edit blocked dates" });
    }

    const body = req.body as Partial<CreateBlockedDateInput>;
    if (!body.blocked_date) {
      return res.status(400).json({ message: "blocked_date is required" });
    }

    const blocked = await createBlockedDate(user.userId, {
      blocked_date: body.blocked_date,
      reason: body.reason,
    });

    return res.status(201).json(blocked);
  } catch (err) {
    console.error("createBlockedDateHandler error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

export const deleteBlockedDateHandler = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as AuthPayload | undefined;
    if (!user) return res.status(401).json({ message: "Unauthorized" });
    if (user.role !== "provider" && user.role !== "admin") {
      return res.status(403).json({ message: "Only providers can edit blocked dates" });
    }

    const { id } = req.params;
    const success = await deleteBlockedDate(id, user.userId);

    if (!success) {
      return res.status(404).json({ message: "Blocked date not found" });
    }

    return res.json({ message: "Blocked date deleted" });
  } catch (err) {
    console.error("deleteBlockedDateHandler error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};

// ---------------- Public: available slots for date ----------------

export const getProviderSlotsForDateHandler = async (
  req: Request,
  res: Response
) => {
  try {
    const { providerId } = req.params;
    const { date, stepMinutes } = req.query as {
      date?: string;
      stepMinutes?: string;
    };

    if (!date) {
      return res.status(400).json({ message: "date is required (YYYY-MM-DD)" });
    }

    // Check if provider is blocked completely
    const blocked = await isProviderBlockedOnDate(providerId, date);
    if (blocked) {
      return res.json({ date, slots: [] });
    }

    const jsDate = new Date(date);
    if (isNaN(jsDate.getTime())) {
      return res.status(400).json({ message: "Invalid date format" });
    }

    const dayOfWeek = mapJsDayToEnum(jsDate.getUTCDay());
    const availability = await listAvailabilityForProviderOnDay(
      providerId,
      dayOfWeek
    );

    if (availability.length === 0) {
      return res.json({ date, slots: [] });
    }

    const bookedTimes = await listBookedTimesForDate(providerId, date);
    const bookedSet = new Set(bookedTimes); // "HH:MM"

    const step = stepMinutes ? Number(stepMinutes) : 30;
    const allSlots: string[] = [];

    for (const range of availability) {
      const start = range.start_time.substring(0, 5);
      const end = range.end_time.substring(0, 5);

      const rangeSlots = generateSlots(start, end, step);
      for (const slot of rangeSlots) {
        if (!bookedSet.has(slot)) {
          allSlots.push(slot);
        }
      }
    }

    return res.json({
      provider_id: providerId,
      date,
      slots: allSlots,
    });
  } catch (err) {
    console.error("getProviderSlotsForDateHandler error:", err);
    return res.status(500).json({ message: "Server error" });
  }
};
