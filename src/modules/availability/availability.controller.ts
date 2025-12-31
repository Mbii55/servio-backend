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

const BUFFER_TIME_MINUTES = 30; // 30 minute buffer between appointments

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

// helper: convert time string to minutes since midnight
function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

// helper: convert minutes to time string HH:MM
function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

// helper: check if a YYYY-MM-DD string equals "today" in SERVER LOCAL time
function isTodayLocal(dateStr: string): boolean {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const todayStr = `${yyyy}-${mm}-${dd}`;
  return dateStr === todayStr;
}

// helper: round UP minutes to the next slot step (e.g., 11:01 → 11:30 if step=30)
function roundUpToStep(minutes: number, step: number): number {
  return Math.ceil(minutes / step) * step;
}


// helper: generate time slots with buffer consideration
function generateSlotsWithBuffer(
  start: string,
  end: string,
  serviceDurationMinutes: number,
  bookedTimes: Set<string>
): string[] {
  const startMinutes = timeToMinutes(start);
  const endMinutes = timeToMinutes(end);

  const slots: string[] = [];
  let currentMinutes = startMinutes;

  while (currentMinutes + serviceDurationMinutes <= endMinutes) {
    const slotTime = minutesToTime(currentMinutes);
    
    // Check if this slot or any time within service duration is booked
    let isSlotAvailable = true;
    for (let i = 0; i < serviceDurationMinutes; i += 30) {
      const checkTime = minutesToTime(currentMinutes + i);
      if (bookedTimes.has(checkTime)) {
        isSlotAvailable = false;
        break;
      }
    }

    if (isSlotAvailable) {
      slots.push(slotTime);
    }

    // ✅ FIX: Check if we can fit another appointment AFTER buffer
    const nextSlotWithBuffer = currentMinutes + serviceDurationMinutes + BUFFER_TIME_MINUTES;
    
    if (nextSlotWithBuffer + serviceDurationMinutes <= endMinutes) {
      // There's room for another appointment after buffer, so use buffer spacing
      currentMinutes += serviceDurationMinutes + BUFFER_TIME_MINUTES;
    } else {
      // No room for another appointment after buffer
      // Try without buffer to see if we can squeeze one more in
      currentMinutes += serviceDurationMinutes;
    }
  }

  return slots;
}


// ---------------- Provider management ----------------

export const listMyAvailabilityHandler = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as AuthPayload | undefined;
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    if (user.role !== "provider" && user.role !== "admin") {
      return res.status(403).json({ error: "Only providers can view this" });
    }

    const availability = await listAvailabilityForProvider(user.userId);
    return res.json(availability);
  } catch (err) {
    console.error("listMyAvailabilityHandler error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

export const createAvailabilityHandler = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as AuthPayload | undefined;
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    if (user.role !== "provider" && user.role !== "admin") {
      return res.status(403).json({ error: "Only providers can edit availability" });
    }

    const body = req.body as Partial<CreateAvailabilityInput>;
    if (!body.day_of_week || !body.start_time || !body.end_time) {
      return res.status(400).json({
        error: "day_of_week, start_time, end_time are required",
      });
    }

    const availability = await createAvailability(user.userId, {
      day_of_week: body.day_of_week,
      start_time: body.start_time,
      end_time: body.end_time,
      is_available: body.is_available ?? true,
    });

    return res.status(201).json(availability);
  } catch (err) {
    console.error("createAvailabilityHandler error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

export const updateAvailabilityHandler = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as AuthPayload | undefined;
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    if (user.role !== "provider" && user.role !== "admin") {
      return res.status(403).json({ error: "Only providers can edit availability" });
    }

    const { id } = req.params;
    const body = req.body as UpdateAvailabilityInput;

    const updated = await updateAvailability(id, user.userId, body);
    if (!updated) {
      return res.status(404).json({ error: "Availability slot not found" });
    }

    return res.json(updated);
  } catch (err) {
    console.error("updateAvailabilityHandler error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

export const deleteAvailabilityHandler = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as AuthPayload | undefined;
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    if (user.role !== "provider" && user.role !== "admin") {
      return res.status(403).json({ error: "Only providers can edit availability" });
    }

    const { id } = req.params;
    const success = await deleteAvailability(id, user.userId);

    if (!success) {
      return res.status(404).json({ error: "Availability slot not found" });
    }

    return res.json({ message: "Availability slot deleted" });
  } catch (err) {
    console.error("deleteAvailabilityHandler error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

// ---------------- Blocked dates ----------------

export const listMyBlockedDatesHandler = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as AuthPayload | undefined;
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    if (user.role !== "provider" && user.role !== "admin") {
      return res.status(403).json({ error: "Only providers can view this" });
    }

    const blocked = await listBlockedDatesForProvider(user.userId);
    return res.json(blocked);
  } catch (err) {
    console.error("listMyBlockedDatesHandler error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

export const createBlockedDateHandler = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as AuthPayload | undefined;
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    if (user.role !== "provider" && user.role !== "admin") {
      return res.status(403).json({ error: "Only providers can edit blocked dates" });
    }

    const body = req.body as Partial<CreateBlockedDateInput>;
    if (!body.blocked_date) {
      return res.status(400).json({ error: "blocked_date is required" });
    }

    const blocked = await createBlockedDate(user.userId, {
      blocked_date: body.blocked_date,
      reason: body.reason,
    });

    return res.status(201).json(blocked);
  } catch (err) {
    console.error("createBlockedDateHandler error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

export const deleteBlockedDateHandler = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as AuthPayload | undefined;
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    if (user.role !== "provider" && user.role !== "admin") {
      return res.status(403).json({ error: "Only providers can edit blocked dates" });
    }

    const { id } = req.params;
    const success = await deleteBlockedDate(id, user.userId);

    if (!success) {
      return res.status(404).json({ error: "Blocked date not found" });
    }

    return res.json({ message: "Blocked date deleted" });
  } catch (err) {
    console.error("deleteBlockedDateHandler error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

// ---------------- Public: available slots for date ----------------

export const getProviderSlotsForDateHandler = async (
  req: Request,
  res: Response
) => {
  try {
    const { providerId } = req.params;
    const { date, serviceDuration } = req.query as {
      date?: string;
      serviceDuration?: string;
    };

    if (!date) {
      return res.status(400).json({ error: "date is required (YYYY-MM-DD)" });
    }

    if (!serviceDuration) {
      return res.status(400).json({ error: "serviceDuration (in minutes) is required" });
    }

    const durationMinutes = Number(serviceDuration);
    if (isNaN(durationMinutes) || durationMinutes <= 0) {
      return res.status(400).json({ error: "serviceDuration must be a positive number" });
    }

    // ✅ Parse requested date in LOCAL timezone
    const requestedDate = new Date(`${date}T00:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const maxDate = new Date(today);
    maxDate.setDate(maxDate.getDate() + 30);

    if (requestedDate < today || requestedDate > maxDate) {
      return res.status(400).json({
        error: "Date must be within the next 30 days",
      });
    }

    // ✅ Check if provider is blocked on this date
    const blocked = await isProviderBlockedOnDate(providerId, date);
    if (blocked) {
      return res.json({
        provider_id: providerId,
        date,
        slots: [],
        message: "Provider is unavailable on this date",
      });
    }

    // ✅ Use LOCAL day
    const dayOfWeek = mapJsDayToEnum(requestedDate.getDay());

    const availability = await listAvailabilityForProviderOnDay(providerId, dayOfWeek);

    if (availability.length === 0) {
      return res.json({
        provider_id: providerId,
        date,
        slots: [],
        message: "Provider is not available on this day of the week",
      });
    }

    const bookedTimes = await listBookedTimesForDate(providerId, date);
    const bookedSet = new Set(bookedTimes);

    const allSlots: string[] = [];

    for (const range of availability) {
      const start = range.start_time.substring(0, 5);
      const end = range.end_time.substring(0, 5);

      const rangeSlots = generateSlotsWithBuffer(
        start,
        end,
        durationMinutes,
        bookedSet
      );

      allSlots.push(...rangeSlots);
    }

    // ✅ NEW FIX: If selected date is today, hide past times
    let finalSlots = allSlots;

    if (isTodayLocal(date)) {
      const now = new Date();
      const nowMinutes = now.getHours() * 60 + now.getMinutes();

      // Match your slot granularity (your availability checks use 30-min blocks)
      const STEP_MINUTES = 30;

      // Round UP to next valid slot
      const earliestAllowed = roundUpToStep(nowMinutes, STEP_MINUTES);

      finalSlots = allSlots.filter((slot) => timeToMinutes(slot) >= earliestAllowed);
    }

    // Optional cleanup: sort + unique
    finalSlots = Array.from(new Set(finalSlots)).sort(
      (a, b) => timeToMinutes(a) - timeToMinutes(b)
    );

    return res.json({
      provider_id: providerId,
      date,
      service_duration_minutes: durationMinutes,
      buffer_time_minutes: BUFFER_TIME_MINUTES,
      slots: finalSlots,
    });
  } catch (err) {
    console.error("getProviderSlotsForDateHandler error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};
