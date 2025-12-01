import { Router } from "express";
import healthRouter from "./health.routes";
import queryRouter from "./query.routes";

const router = Router();

router.use("/health", healthRouter);
router.use("/api/query", queryRouter);

export default router;