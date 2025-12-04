// app/controllers/query.controller.ts
import { Request, Response, NextFunction } from "express";
import { QueryRequestBody } from "../types/query";
import { handleUserQuery } from "../services/query.service";

export async function queryController(
  req: Request<unknown, unknown, QueryRequestBody>,
  res: Response,
  next: NextFunction
) {
  try {
    const {
      prompt,
      dataset,
      columns,
      context,
      // 🔹 NEW: multi-dataset fields
      datasets,
      activeDatasetId,
    } = (req.body || {}) as QueryRequestBody;

    if (!prompt || typeof prompt !== "string") {
      return res.status(400).json({
        error: "BadRequest",
        message: "Field 'prompt' is required and must be a string.",
      });
    }

    const result = await handleUserQuery({
      prompt,
      // ✅ Legacy single-dataset support (safe defaults)
      dataset: Array.isArray(dataset) ? dataset : [],
      columns: Array.isArray(columns) ? columns : [],

      // ✅ Optional context
      context: context || {},

      // ✅ NEW: multi-dataset support (optional)
      datasets: Array.isArray(datasets) ? datasets : undefined,
      activeDatasetId:
        typeof activeDatasetId === "string" ? activeDatasetId : undefined,
    } as any); // `as any` to bridge to HandleUserQueryInput until everything is fully refactored

    res.json(result);
  } catch (err) {
    next(err);
  }
}