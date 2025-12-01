import { Request, Response, NextFunction } from "express";

export function notFoundMiddleware(
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  res.status(404).json({
    error: "NotFound",
    message: "Route not found",
  });
}