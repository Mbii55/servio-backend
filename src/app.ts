import express, { Application, Request, Response } from "express";
import cors from "cors";

import authRoutes from "./modules/auth/auth.routes";
import categoryRoutes from "./modules/categories/category.routes";
import serviceRoutes from "./modules/services/service.routes";
import addressRoutes from "./modules/addresses/address.routes";
import bookingRoutes from "./modules/bookings/booking.routes";
import availabilityRoutes from "./modules/availability/availability.routes";

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
app.use("/api/v1/addresses", addressRoutes);
app.use("/api/v1/bookings", bookingRoutes);
app.use("/api/v1/availability", availabilityRoutes);

export default app;
