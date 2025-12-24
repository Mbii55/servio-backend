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
