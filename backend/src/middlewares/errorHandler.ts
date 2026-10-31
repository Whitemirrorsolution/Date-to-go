import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/AppError.js';
import { logger } from '../utils/logger.js';
import { isProd } from '../config/env.js';

interface ErrorResponse {
  success: false;
  message: string;
  code?: string | undefined;
  errors?: Record<string, string[]> | undefined;
  // Only included in non-production environments
  stack?: string | undefined;
}

/**
 * Central Express error handler.
 * - Handles AppError (operational), ZodError (validation), and unexpected errors.
 * - Never leaks stack traces in production.
 * - Logs with structured pino logger.
 */
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void {
  // ── Zod validation errors ─────────────────────────────────────────────────
  if (err instanceof ZodError) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of err.issues) {
      const field = issue.path.join('.') || '_root';
      (fieldErrors[field] ??= []).push(issue.message);
    }

    logger.warn({ requestId: req.requestId, path: req.path, errors: fieldErrors }, 'Validation error');

    const body: ErrorResponse = {
      success: false,
      message: 'Validation failed',
      code: 'VALIDATION_ERROR',
      errors: fieldErrors,
    };
    res.status(400).json(body);
    return;
  }

  // ── Operational (AppError) ─────────────────────────────────────────────────
  if (err instanceof AppError) {
    logger.warn(
      { requestId: req.requestId, path: req.path, statusCode: err.statusCode, code: err.code },
      err.message,
    );

    const body: ErrorResponse = {
      success: false,
      message: err.message,
      ...(err.code ? { code: err.code } : {}),
      ...(!isProd && err.stack ? { stack: err.stack } : {}),
    };
    res.status(err.statusCode).json(body);
    return;
  }

  // ── Mongoose duplicate key error (code 11000) ──────────────────────────────
  if (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code: unknown }).code === 11000
  ) {
    const mongoErr = err as any;
    const dupKey = mongoErr.keyValue ? Object.keys(mongoErr.keyValue).join(', ') : 'field';
    logger.warn(
      { requestId: req.requestId, path: req.path, keyPattern: mongoErr.keyPattern, keyValue: mongoErr.keyValue },
      'Duplicate key error',
    );
    res.status(409).json({
      success: false,
      message: `A resource with that value already exists (${dupKey}).`,
      code: 'DUPLICATE_KEY',
      field: dupKey,
    });
    return;
  }

  // ── Unknown / programming errors ───────────────────────────────────────────
  logger.error(
    { err, requestId: req.requestId, path: req.path, method: req.method },
    'Unhandled error',
  );

  const body: ErrorResponse = {
    success: false,
    message: isProd ? 'An unexpected error occurred. Please try again later.' : (err instanceof Error ? err.message : 'Unknown error'),
    code: 'INTERNAL_ERROR',
    ...(!isProd && err instanceof Error && { stack: err.stack }),
  };
  res.status(500).json(body);
}

/**
 * 404 handler – must be registered after all routes.
 */
export function notFoundHandler(req: Request, res: Response): void {
  logger.warn({ requestId: req.requestId, path: req.path, method: req.method }, '404 Not Found');
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.path} not found`,
    code: 'NOT_FOUND',
  });
}
