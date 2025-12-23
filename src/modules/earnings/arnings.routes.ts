// src/modules/earnings/earnings.routes.ts
import { Router } from "express";
import { auth } from "../../middleware/auth.middleware";
import {
  getEarningsSummaryHandler,
  getEarningsTransactionsHandler,
  getMonthlyEarningsHandler,
} from "./earnings.controller";

const router = Router();

// Provider earnings endpoints
router.get("/summary", auth("provider"), getEarningsSummaryHandler);
router.get("/transactions", auth("provider"), getEarningsTransactionsHandler);
router.get("/monthly", auth("provider"), getMonthlyEarningsHandler);

export default router;