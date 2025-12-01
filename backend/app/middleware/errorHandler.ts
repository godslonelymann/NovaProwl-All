import { Request, Response, NextFunction } from "express";

interface AppError extends Error {
  status?: number;
  details?: unknown;
}

export function errorHandlerMiddleware(
  err: AppError,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  // eslint-disable-next-line no-console
  console.error(
    `[error] requestId=${(req as any).requestId || "-"}:`,
    err.message,
    err.stack
  );

  const status = err.status && err.status >= 400 ? err.status : 500;

  res.status(status).json({
    error: err.name || "InternalServerError",
    message:
      status === 500 && process.env.NODE_ENV === "production"
        ? "Something went wrong"
        : err.message,
    details: err.details ?? undefined,
  });
}