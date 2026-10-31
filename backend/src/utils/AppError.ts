/**
 * AppError – typed operational error with HTTP status code.
 * Only operational errors (bad input, auth failure, etc.) use this class.
 * Programming errors bubble up as plain Errors and are caught by the central handler.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly code?: string | undefined;

  constructor(message: string, statusCode: number, code?: string | undefined) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    if (code !== undefined) {
      this.code = code;
    }
    // Restore prototype chain
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

/** Common factory helpers */
export const Errors = {
  badRequest: (msg: string, code?: string): AppError => new AppError(msg, 400, code),
  unauthorized: (msg = 'Unauthorized'): AppError => new AppError(msg, 401, 'UNAUTHORIZED'),
  forbidden: (msg = 'Forbidden'): AppError => new AppError(msg, 403, 'FORBIDDEN'),
  notFound: (resource = 'Resource'): AppError =>
    new AppError(`${resource} not found`, 404, 'NOT_FOUND'),
  conflict: (msg: string): AppError => new AppError(msg, 409, 'CONFLICT'),
  tooManyRequests: (msg = 'Too many requests'): AppError =>
    new AppError(msg, 429, 'TOO_MANY_REQUESTS'),
  internal: (msg = 'Internal server error'): AppError =>
    new AppError(msg, 500, 'INTERNAL_ERROR'),
};
