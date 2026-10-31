import type { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';

/**
 * HTTP request logger middleware.
 * Logs method, path, status, and duration.
 * Intentionally excludes query params and body to avoid PII leakage.
 */
export function httpLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();

  res.on('finish', () => {
    const durationMs = Date.now() - start;
    const level =
      res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';

    logger[level]({
      requestId: req.requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      durationMs,
      contentLength: res.get('content-length') ?? 0,
    }, `${req.method} ${req.path} ${res.statusCode} ${durationMs}ms`);
  });

  next();
}
