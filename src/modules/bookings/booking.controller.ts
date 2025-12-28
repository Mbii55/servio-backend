// src/modules/bookings/booking.controller.ts
import { Request, Response } from "express";
import {
  createBookingWithAddons,
  listBookingsForUser,
  getBookingById,
  updateBookingStatus,
  listAllBookingsForAdmin,
} from "./booking.repository";
import { BookingStatus } from "./booking.types";
import { AuthPayload } from "../../middleware/auth.middleware";
import { Server } from "socket.io";
import { listProviderBookingsDetailed } from "./booking.repository";
import { createNotification } from "../notifications/notification.repository";
import { sendPushNotificationToUser } from "../../utils/expo-push.service";

// ✅ Helper function to notify customer about booking status changes
async function notifyCustomerBookingUpdate(
  customerId: string,
  bookingId: string,
  bookingNumber: string,
  newStatus: string
) {
  const messages: Record<string, { title: string; body: string; type: string }> = {
    accepted: {
      title: '✅ Booking Accepted',
      body: `Your booking #${bookingNumber} has been accepted.`,
      type: 'booking_accepted',
    },
    rejected: {
      title: '❌ Booking Rejected',
      body: `Your booking #${bookingNumber} was rejected.`,
      type: 'booking_rejected',
    },
    in_progress: {
      title: '🔧 Service Started',
      body: `Your booking #${bookingNumber} is now in progress.`,
      type: 'booking_in_progress',
    },
    completed: {
      title: '✨ Service Completed',
      body: `Your booking #${bookingNumber} has been completed.`,
      type: 'booking_completed',
    },
    cancelled: {
      title: '🚫 Booking Cancelled',
      body: `Booking #${bookingNumber} has been cancelled.`,
      type: 'booking_cancelled',
    },
  };

  const message = messages[newStatus];
  if (!message) return;

  try {
    // Create in-app notification
    await createNotification({
      user_id: customerId,
      type: message.type,
      title: message.title,
      message: message.body,
      data: { booking_id: bookingId, booking_number: bookingNumber },
    });

    // Send push notification
    await sendPushNotificationToUser({
      userId: customerId,
      title: message.title,
      body: message.body,
      data: {
        booking_id: bookingId,
        booking_number: bookingNumber,
        type: message.type,
      },
    });

    console.log(`✅ Customer notification sent for booking ${bookingNumber}`);
  } catch (error) {
    console.error('Error sending customer notification:', error);
  }
}

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

    // ✅ Create notification for provider
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

      // ✅ Send push notification to provider
      await sendPushNotificationToUser({
        userId: providerId,
        title: "New booking request",
        body: `New booking request (${bookingNumber})`,
        data: {
          booking_id: bookingId,
          service_id: service_id,
          customer_id: user.userId,
          type: "booking_created",
        },
      });
    }

    // ✅ Socket emit
    const io = req.app.get("io") as Server | undefined;
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

    // ✅ Get booking BEFORE update (to get customer_id and booking_number)
    const booking = await getBookingById(id);
    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }

    const updated = await updateBookingStatus(id, status, {
      cancellation_reason,
      provider_notes,
    });

    if (!updated) {
      return res.status(404).json({ message: "Booking not found" });
    }

    // ✅ Notify customer about status change (only when provider/admin updates)
    if (user.role !== "customer") {
      await notifyCustomerBookingUpdate(
        booking.customer_id,
        booking.id,
        booking.booking_number,
        status
      );
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

    if (user.role !== "provider" && user.role !== "admin") {
      return res.status(403).json({ message: "Forbidden" });
    }

    const providerId = user.userId;
    const data = await listProviderBookingsDetailed(providerId);
    return res.json(data);
  } catch (error) {
    console.error("listProviderBookingsDetailedHandler error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

// ✅ NEW: Admin-only endpoint with filtering
export const listAdminBookingsHandler = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as AuthPayload | undefined;
    if (!user) return res.status(401).json({ message: "Unauthorized" });
    
    if (user.role !== "admin") {
      return res.status(403).json({ message: "Forbidden" });
    }

    // Get query parameters
    const { 
      from, 
      to, 
      status, 
      q: searchQuery 
    } = req.query as {
      from?: string;
      to?: string;
      status?: string;
      q?: string;
    };

    // Call the new admin repository function
    const bookings = await listAllBookingsForAdmin({
      from,
      to,
      status,
      searchQuery
    });
    
    // Format for frontend
    const formatted = bookings.map(booking => ({
      ...booking,
      customer_name: booking.customer_first_name && booking.customer_last_name 
        ? `${booking.customer_first_name} ${booking.customer_last_name}`
        : booking.customer_first_name || booking.customer_last_name || null,
      customer_email: booking.customer_email || null,
      customer_phone: booking.customer_phone || null,
      provider_name: booking.provider_business_name || 
        (booking.provider_first_name && booking.provider_last_name 
          ? `${booking.provider_first_name} ${booking.provider_last_name}`
          : booking.provider_first_name || booking.provider_last_name || null),
      provider_email: booking.provider_business_email || booking.provider_email || null,
      provider_phone: booking.provider_business_phone || booking.provider_phone || null,
      category_name: booking.category_name || null,
      service_price: Number(booking.service_price) || 0,
      // Ensure all required fields exist
      payment_status: booking.payment_status || 'pending',
      payment_method: booking.payment_method || 'cash',
      transaction_id: booking.transaction_id || null
    }));
    
    return res.json(formatted);
  } catch (error) {
    console.error("listAdminBookingsHandler error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};