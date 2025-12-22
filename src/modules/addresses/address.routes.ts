// src/modules/addresses/address.routes.ts
import { Router } from "express";
import {
  listMyAddresses,
  createAddressHandler,
  updateAddressHandler,
  deleteAddressHandler,
} from "./address.controller";
import { auth } from "../../middleware/auth.middleware";

const router = Router();

// All require authentication (customer/provider/admin)
router.get("/me", auth(), listMyAddresses);
router.post("/", auth(), createAddressHandler);
router.patch("/:id", auth(), updateAddressHandler);
router.delete("/:id", auth(), deleteAddressHandler);

export default router;
