// src/modules/business_profiles/business_profiles.controller.ts
import { Request, Response } from "express";
import * as Repo from "./businessProfile.repository";

export async function adminListProviders(req: Request, res: Response) {
  const rows = await Repo.adminListProviderProfiles();
  res.json({ providers: rows });
}

export async function adminToggleActive(req: Request, res: Response) {
  const { id } = req.params;
  const { is_active } = req.body as { is_active: boolean };
  await Repo.adminSetBusinessActive(id, is_active);
  res.json({ success: true });
}

// ✅ NEW: Update commission rate for a specific provider
export async function adminUpdateCommissionRate(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { commission_rate } = req.body as { commission_rate: number };

    // Validate commission rate
    if (commission_rate === undefined || commission_rate === null) {
      return res.status(400).json({ error: "commission_rate is required" });
    }

    if (commission_rate < 0 || commission_rate > 100) {
      return res.status(400).json({ error: "commission_rate must be between 0 and 100" });
    }

    await Repo.adminUpdateCommissionRate(id, commission_rate);
    
    return res.json({ 
      success: true,
      message: "Commission rate updated successfully" 
    });
  } catch (error: any) {
    console.error("adminUpdateCommissionRate error:", error);
    return res.status(500).json({ error: "Server error", detail: error.message });
  }
}

// ✅ NEW: Get commission rate for a specific provider (useful for admin UI)
export async function adminGetProviderCommissionRate(req: Request, res: Response) {
  try {
    const { id } = req.params;
    
    const rate = await Repo.getCommissionRateByBusinessProfileId(id);
    
    if (rate === null) {
      return res.status(404).json({ error: "Business profile not found" });
    }
    
    return res.json({ commission_rate: rate });
  } catch (error: any) {
    console.error("adminGetProviderCommissionRate error:", error);
    return res.status(500).json({ error: "Server error", detail: error.message });
  }
}

// ✅ NEW: Get single provider profile with full details
export async function adminGetProviderProfile(req: Request, res: Response) {
  try {
    const { id } = req.params;
    
    const profile = await Repo.adminGetFullProviderProfile(id);
    
    if (!profile) {
      return res.status(404).json({ error: "Provider profile not found" });
    }
    
    return res.json(profile);
  } catch (error: any) {
    console.error("adminGetProviderProfile error:", error);
    return res.status(500).json({ error: "Server error", detail: error.message });
  }
}