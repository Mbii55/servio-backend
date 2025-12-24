// src/modules/bookings/booking.controller.ts
import { Request, Response } from "express";
import {
  createBookingWithAddons,
  listBookingsForUser,
  getBookingById,
  updateBookingStatus,
} from "./booking.repository";
import { BookingStatus } from "./booking.types";
import { AuthPayload } from "../../middleware/auth.middleware";
import { Server } from "socket.io";
import { listProviderBookingsDetailed } from "./booking.repository";
import { createNotification } from "../notifications/notification.repository";

export const createBookingHandler = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as AuthPayload | undefined;
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    const {
      service_id,
      address_id,
      scheduled_date,
      scheduled_time,
      addons,
      payment_method,
      customer_notes,
    } = req.body as {
      service_id: string;
      address_id?: string;
      scheduled_date: string;
      scheduled_time: string;
      addons?: { addon_id: string; quantity?: number }[];
      payment_method?: "cash" | "card" | "wallet";
      customer_notes?: string;
    };

    if (!service_id || !scheduled_date || !scheduled_time) {
      return res.status(400).json({
        message: "service_id, scheduled_date, scheduled_time are required",
      });
    }

    const booking = await createBookingWithAddons({
      customerId: user.userId,
      serviceId: service_id,
      addressId: address_id,
      scheduled_date,
      scheduled_time,
      addons,
      payment_method,
      customer_notes,
    });

    // ✅ Create notification for provider (partner)
    // booking must include provider_id + id. If not, tell me and I’ll adjust.
    if ((booking as any)?.provider_id) {
      const bookingId = (booking as any).id;
      const providerId = (booking as any).provider_id;
      const bookingNumber = (booking as any).booking_number;

      await createNotification({
        user_id: providerId,
        type: "booking_created",
        title: "New booking request",
        message: bookingNumber
          ? `You received a new booking request (${bookingNumber}).`
          : "You received a new booking request.",
        data: {
          booking_id: bookingId,
          service_id: service_id,
          customer_id: user.userId,
        },
      });
    }

    // ✅ Socket emit (keep)
    const io = req.app.get("io") as Server | undefined;

    // Better: emit to that provider only (room), fallback to global if you haven't implemented rooms yet
    const providerId = (booking as any)?.provider_id;
    if (providerId) {
      io?.to(`provider:${providerId}`).emit("booking:created", booking);
      io?.to(`provider:${providerId}`).emit("notification:new", {
        type: "booking_created",
        booking_id: (booking as any)?.id,
      });
    } else {
      io?.emit("booking:created", booking);
    }

    return res.status(201).json(booking);
  } catch (error: any) {
    console.error("createBookingHandler error:", error);
    return res.status(500).json({ message: "Server error", detail: error.message });
  }
};


export const listMyBookingsHandler = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as AuthPayload | undefined;
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    const bookings = await listBookingsForUser(user.userId, user.role);
    return res.json(bookings);
  } catch (error) {
    console.error("listMyBookingsHandler error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

export const getBookingHandler = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as AuthPayload | undefined;
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    const { id } = req.params;
    const booking = await getBookingById(id);

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    // TODO: extra check that user is involved in booking OR admin
    return res.json(booking);
  } catch (error) {
    console.error("getBookingHandler error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

export const updateBookingStatusHandler = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as AuthPayload | undefined;
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    const { id } = req.params;
    const { status, cancellation_reason, provider_notes } = req.body as {
      status: BookingStatus;
      cancellation_reason?: string;
      provider_notes?: string;
    };

    if (!status) {
      return res.status(400).json({ message: "status is required" });
    }

    // Simple role rule: customers can only cancel; providers/admin can do all
    if (user.role === "customer" && status !== "cancelled") {
      return res.status(403).json({ message: "Customers can only cancel bookings" });
    }

    const updated = await updateBookingStatus(id, status, {
      cancellation_reason,
      provider_notes,
    });

    if (!updated) {
      return res.status(404).json({ message: "Booking not found" });
    }

    const io = req.app.get("io") as Server | undefined;
    io?.emit("booking:updated", updated);

    return res.json(updated);
  } catch (error: any) {
    console.error("updateBookingStatusHandler error:", error);
    if (error.message?.startsWith("Invalid status transition")) {
      return res.status(400).json({ message: error.message });
    }
    return res.status(500).json({ message: "Server error" });
  }
};

export const listProviderBookingsDetailedHandler = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as AuthPayload | undefined;
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    // provider-only (or allow admin if you want)
    if (user.role !== "provider" && user.role !== "admin") {
      return res.status(403).json({ message: "Forbidden" });
    }

    // Provider sees only their bookings
    const providerId = user.userId;

    const data = await listProviderBookingsDetailed(providerId);
    return res.json(data);
  } catch (error) {
    console.error("listProviderBookingsDetailedHandler error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};