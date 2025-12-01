import { Request, Response, NextFunction } from "express";
import { QueryRequestBody } from "../types/query";
import { handleUserQuery } from "../services/query.service";

export async function queryController(
  req: Request<unknown, unknown, QueryRequestBody>,
  res: Response,
  next: NextFunction
) {
  try {
    const { prompt, dataset, columns, context } = req.body || {};

    if (!prompt || typeof prompt !== "string") {
      return res.status(400).json({
        error: "BadRequest",
        message: "Field 'prompt' is required and must be a string.",
      });
    }

    const result = await handleUserQuery({
      prompt,
      dataset: dataset || [],
      columns: columns || [],
      context: context || {},
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
}