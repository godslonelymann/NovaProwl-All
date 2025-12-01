import { Router } from "express";
import { queryController } from "../controllers/query.controller";

const router = Router();

// POST /api/query
router.post("/", queryController);

export default router;