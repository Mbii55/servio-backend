// src/app.ts
import express, { Application, Request, Response } from "express";
import cors from "cors";

import authRoutes from "./modules/auth/auth.routes";
import categoryRoutes from "./modules/categories/category.routes";
import serviceRoutes from "./modules/services/service.routes";
import searchRoutes from "./modules/search/search.routes"; // ✅ Add this
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

const app: Application = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/health", (req: Request, res: Response) => {
  res.json({ status: "OK", message: "Servio API is running" });
});

app.get("/api/v1", (req: Request, res: Response) => {
  res.json({
    message: "Servio API v1",
    version: "1.0.0",
  });
});

// Modules
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/categories", categoryRoutes);
app.use("/api/v1/services", serviceRoutes);
app.use("/api/v1/search", searchRoutes); // ✅ Add this line
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

export default app;