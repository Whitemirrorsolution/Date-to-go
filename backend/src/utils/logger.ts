import pino from 'pino';
import { env, isDev } from '../config/env.js';

/**
 * Structured logger (pino).
 *
 * Rules:
 * - NEVER log PII (phone, email, Aadhaar, password, token).
 * - Use { err } for errors (pino serialises Error objects correctly).
 * - Use structured key-value pairs rather than interpolated strings.
 */
export const logger = pino({
  level: env.LOG_LEVEL,
  // Pretty-print only in development
  ...(isDev && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
      },
    },
  }),
  // Strip PII fields from logs in all environments
  redact: {
    paths: [
      'email',
      'phone',
      'password',
      'token',
      'accessToken',
      'refreshToken',
      'aadhaarNumber',
      'req.headers.authorization',
      'req.headers.cookie',
      'body.password',
      'body.token',
    ],
    censor: '[REDACTED]',
  },
  base: {
    env: env.NODE_ENV,
    app: env.APP_NAME,
  },
  serializers: {
    err: pino.stdSerializers.err,
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
  },
});
