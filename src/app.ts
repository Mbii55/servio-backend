// src/app.ts
import express, { Application, Request, Response } from "express";
import cors from "cors";

// Core modules
import authRoutes from "./modules/auth/auth.routes";
import categoryRoutes from "./modules/categories/category.routes";
import serviceRoutes from "./modules/services/service.routes";
import searchRoutes from "./modules/search/search.routes";
import addressRoutes from "./modules/addresses/address.routes";
import bookingRoutes from "./modules/bookings/booking.routes";
import availabilityRoutes from "./modules/availability/availability.routes";
import earningsRoutes from "./modules/earnings/arnings.routes";
import uploadRoutes from "./modules/upload/upload.routes";
import addonRoutes from "./modules/addons/addon.routes";
import profileRoutes from "./modules/profile/profile.routes";
import favoriteRoutes from "./modules/favorites/favorite.routes";
import notificationRoutes from "./modules/notifications/notification.routes";
import usersRoutes from "./modules/users/user.routes";
import businessProfilesRoutes from "./modules/businessProfiles/business_profiles.routes";
import adminDashboardRoutes from "./modules/adminDashboard/adminDashboard.routes";
import reviewRoutes from "./modules/reviews/review.routes";
import verificationRoutes from "./modules/verification/verification.routes";

const app: Application = express();

/* ---------------------------------------------------
   CORS CONFIG (Admin + Partner dashboards)
--------------------------------------------------- */

// normalize origin (remove trailing slash if exists)
const normalize = (v?: string) => (v ? v.replace(/\/$/, "") : v);

const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  normalize(process.env.ADMIN_ORIGIN),
  normalize(process.env.PARTNER_ORIGIN),
].filter(Boolean) as string[];

app.use(
  cors({
    origin: (origin, cb) => {
      // allow Postman / server-to-server requests
      if (!origin) return cb(null, true);

      if (allowedOrigins.includes(origin)) {
        return cb(null, true);
      }

      // ❗ DO NOT throw — deny silently (prevents 500)
      return cb(null, false);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

/* ---------------------------------------------------
   Health & Root
--------------------------------------------------- */

app.get("/health", (req: Request, res: Response) => {
  res.json({ status: "OK", message: "Servio API is running" });
});

app.get("/api/v1", (req: Request, res: Response) => {
  res.json({
    message: "Servio API v1",
    version: "1.0.0",
  });
});

/* ---------------------------------------------------
   Routes
--------------------------------------------------- */

app.use("/api/v1/auth", authRoutes);

app.use("/api/v1/categories", categoryRoutes);
app.use("/api/v1/services", serviceRoutes);
app.use("/api/v1/search", searchRoutes);
app.use("/api/v1/addresses", addressRoutes);
app.use("/api/v1/bookings", bookingRoutes);
app.use("/api/v1/availability", availabilityRoutes);
app.use("/api/v1/profile", profileRoutes);
app.use("/api/v1/earnings", earningsRoutes);
app.use("/api/v1/upload", uploadRoutes);
app.use("/api/v1/addons", addonRoutes);
app.use("/api/v1/favorites", favoriteRoutes);
app.use("/api/v1/notifications", notificationRoutes);
app.use("/api/v1/users", usersRoutes);
app.use("/api/v1/businessProfiles", businessProfilesRoutes);
app.use("/api/v1/admin/dashboard", adminDashboardRoutes);
app.use("/api/v1/reviews", reviewRoutes);
app.use("/api/v1/verification", verificationRoutes);

export default app;
