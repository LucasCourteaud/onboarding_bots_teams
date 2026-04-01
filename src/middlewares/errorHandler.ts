import express from "express";

import { AppError, toError } from "../utils/errors";
import { logger } from "../utils/logger";

export function errorHandler(
  error: unknown,
  _req: express.Request,
  res: express.Response,
  _next: express.NextFunction
): void {
  const normalized = toError(error);
  const statusCode = error instanceof AppError ? error.statusCode : 500;

  logger.error(
    {
      err: normalized,
      details: error instanceof AppError ? error.details : undefined,
      statusCode
    },
    "HTTP request failed"
  );

  res.status(statusCode).json({
    error: normalized.message,
    details: error instanceof AppError ? error.details : undefined
  });
}