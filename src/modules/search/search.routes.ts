// src/modules/search/search.routes.ts
import { Router } from "express";
import { searchAllHandler } from "./search.controller";

const router = Router();

// GET /api/v1/search?query=cleaning&categoryId=xxx&limit=20&offset=0
router.get("/", searchAllHandler);

export default router;