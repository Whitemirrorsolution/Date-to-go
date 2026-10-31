import type { Request, Response, NextFunction, RequestHandler } from 'express';

/**
 * Wraps an async route handler so that any thrown error is forwarded
 * to Express's central error handler via next(err).
 *
 * Usage:
 *   router.get('/path', asyncHandler(async (req, res) => { ... }));
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    fn(req, res, next).catch(next);
  };
}
