// src/modules/earnings/earnings.controller.ts
import { Request, Response } from "express";
import { AuthPayload } from "../../middleware/auth.middleware";
import {
  getEarningsSummary,
  getEarningsTransactions,
  getMonthlyEarnings,
} from "./earnings.repository";

export const getEarningsSummaryHandler = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as AuthPayload | undefined;
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (user.role !== "provider" && user.role !== "admin") {
      return res.status(403).json({ error: "Only providers can view earnings" });
    }

    const summary = await getEarningsSummary(user.userId);
    return res.json(summary);
  } catch (err) {
    console.error("getEarningsSummaryHandler error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

export const getEarningsTransactionsHandler = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as AuthPayload | undefined;
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (user.role !== "provider" && user.role !== "admin") {
      return res.status(403).json({ error: "Only providers can view earnings" });
    }

    const transactions = await getEarningsTransactions(user.userId);
    return res.json(transactions);
  } catch (err) {
    console.error("getEarningsTransactionsHandler error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

export const getMonthlyEarningsHandler = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as AuthPayload | undefined;
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (user.role !== "provider" && user.role !== "admin") {
      return res.status(403).json({ error: "Only providers can view earnings" });
    }

    const monthlyData = await getMonthlyEarnings(user.userId);
    return res.json(monthlyData);
  } catch (err) {
    console.error("getMonthlyEarningsHandler error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};