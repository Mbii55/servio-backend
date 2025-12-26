// src/modules/users/user.controller.ts
import { Request, Response } from "express";
import * as UserRepo from "./user.repository";
import { UserRole, UserStatus } from "./user.types";

/* ADMIN — GET ALL USERS (CUSTOMERS & PROVIDERS ONLY) */
export async function adminGetUsers(req: Request, res: Response) {
  try {
    const role = req.query.role as UserRole | undefined;

    // If someone tries role=admin, just return empty (admins are excluded anyway)
    const users = await UserRepo.adminListUsers(role === "admin" ? undefined : role);

    return res.json({ users });
  } catch (err) {
    console.error("adminGetUsers error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}

/* ADMIN — UPDATE USER STATUS */
export async function adminUpdateUserStatus(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { status } = req.body as { status: UserStatus };

    if (!["active", "inactive", "suspended"].includes(status)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    const updated = await UserRepo.adminUpdateUserStatus(id, status);

    if (!updated) {
      return res.status(404).json({ error: "User not found (or cannot update admin)" });
    }

    return res.json({ user: updated });
  } catch (err) {
    console.error("adminUpdateUserStatus error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}

/* CUSTOMER — GET ALL ACTIVE PROVIDERS WITH SERVICES */
export async function getProviders(req: Request, res: Response) {
  try {
    const providers = await UserRepo.getActiveProvidersWithServices();
    return res.json({ providers });
  } catch (err) {
    console.error("getProviders error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}

/* CUSTOMER — GET SINGLE PROVIDER PROFILE WITH SERVICES */
export async function getProviderProfile(req: Request, res: Response) {
  try {
    const { id } = req.params;
    
    const provider = await UserRepo.getProviderProfileWithServices(id);
    
    if (!provider) {
      return res.status(404).json({ 
        error: "Provider not found or not available" 
      });
    }
    
    return res.json({ provider });
  } catch (err) {
    console.error("getProviderProfile error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}

/* CUSTOMER — SEARCH PROVIDERS WITH SERVICES */
export async function searchProviders(req: Request, res: Response) {
  try {
    const { query } = req.query;
    
    if (!query || typeof query !== 'string') {
      // If no search query, return all active providers
      const providers = await UserRepo.getActiveProvidersWithServices();
      return res.json({ providers });
    }
    
    const providers = await UserRepo.searchProvidersByName(query);
    return res.json({ providers });
  } catch (err) {
    console.error("searchProviders error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}

/* CUSTOMER — GET PROVIDERS WITHOUT SERVICES (LEGACY SUPPORT) */
export async function getProvidersBasic(req: Request, res: Response) {
  try {
    const providers = await UserRepo.getActiveProvidersBasic();
    return res.json({ providers });
  } catch (err) {
    console.error("getProvidersBasic error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}