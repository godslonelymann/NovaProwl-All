import { Request, Response, NextFunction } from "express";

function generateRequestId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function requestIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const existing = req.headers["x-request-id"];
  const id =
    typeof existing === "string" && existing.trim().length > 0
      ? existing
      : generateRequestId();

  (req as any).requestId = id;
  res.setHeader("x-request-id", id);

  next();
}