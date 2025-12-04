import { Router } from "express";
import healthRouter from "./health.routes";
import queryRouter from "./query.routes";
import uploadRouter from "./upload.routes"; // ⬅️ NEW

const router = Router();

router.use("/health", healthRouter);

// existing routes
router.use("/api/query", queryRouter);

// NEW: file upload route
router.use("/api", uploadRouter);

export default router;