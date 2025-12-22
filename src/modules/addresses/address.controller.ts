// src/modules/addresses/address.controller.ts
import { Request, Response } from "express";
import {
  listAddressesForUser,
  createAddress,
  updateAddress,
  deleteAddress,
  getAddressById,
} from "./address.repository";
import { CreateAddressInput, UpdateAddressInput } from "./address.types";
import { AuthPayload } from "../../middleware/auth.middleware";

export const listMyAddresses = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as AuthPayload | undefined;
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    const addresses = await listAddressesForUser(user.userId);
    return res.json(addresses);
  } catch (error) {
    console.error("listMyAddresses error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

export const createAddressHandler = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as AuthPayload | undefined;
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    const body = req.body as Partial<CreateAddressInput>;

    if (!body.street_address || !body.city) {
      return res
        .status(400)
        .json({ message: "street_address and city are required" });
    }

    const address = await createAddress(user.userId, {
      street_address: body.street_address,
      city: body.city,
      label: body.label,
      state: body.state,
      postal_code: body.postal_code,
      country: body.country,
      latitude: body.latitude,
      longitude: body.longitude,
      is_default: body.is_default,
    });

    return res.status(201).json(address);
  } catch (error) {
    console.error("createAddressHandler error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

export const updateAddressHandler = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as AuthPayload | undefined;
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    const { id } = req.params;
    const body = req.body as UpdateAddressInput;

    const existing = await getAddressById(id);
    if (!existing || existing.user_id !== user.userId) {
      return res.status(404).json({ message: "Address not found" });
    }

    const updated = await updateAddress(id, user.userId, body);
    if (!updated) {
      return res.status(404).json({ message: "Address not found" });
    }

    return res.json(updated);
  } catch (error) {
    console.error("updateAddressHandler error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

export const deleteAddressHandler = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as AuthPayload | undefined;
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    const { id } = req.params;

    const success = await deleteAddress(id, user.userId);
    if (!success) {
      return res.status(404).json({ message: "Address not found" });
    }

    return res.json({ message: "Address deleted" });
  } catch (error) {
    console.error("deleteAddressHandler error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};
