import type { Request, Response, NextFunction } from 'express';
import { AppSetting } from '../models/AppSetting.js';
import { AppError } from './AppError.js';
import { logger } from './logger.js';

const FLAG_CACHE = new Map<string, { value: any; expiresAt: number }>();
const CACHE_TTL_MS = 30_000; // 30 seconds cache

/**
 * Fetch an AppSetting or feature flag with in-memory caching.
 */
export async function getSetting<T = any>(key: string, defaultValue: T): Promise<T> {
  const now = Date.now();
  const cached = FLAG_CACHE.get(key);
  if (cached && cached.expiresAt > now) {
    return cached.value as T;
  }

  try {
    const doc = await AppSetting.findOne({ key }).lean();
    if (doc && doc.value !== undefined) {
      FLAG_CACHE.set(key, { value: doc.value, expiresAt: now + CACHE_TTL_MS });
      return doc.value as T;
    }
  } catch (err) {
    logger.warn({ err, key }, 'Failed to query AppSetting, using default fallback');
  }

  FLAG_CACHE.set(key, { value: defaultValue, expiresAt: now + CACHE_TTL_MS });
  return defaultValue;
}

/**
 * Returns true if the feature flag is enabled.
 */
export async function isFeatureFlagEnabled(flagKey: string, defaultEnabled = true): Promise<boolean> {
  return getSetting<boolean>(flagKey, defaultEnabled);
}

/**
 * Invalidate a cached setting key (e.g. after admin update).
 */
export function invalidateSettingCache(key?: string): void {
  if (key) {
    FLAG_CACHE.delete(key);
  } else {
    FLAG_CACHE.clear();
  }
}

/**
 * Middleware that gates an endpoint behind a feature flag.
 */
export function requireFeatureFlag(flagKey: string, defaultEnabled = true) {
  return async (_req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      const enabled = await isFeatureFlagEnabled(flagKey, defaultEnabled);
      if (!enabled) {
        return next(
          new AppError(
            `This feature is currently disabled (${flagKey})`,
            403,
            'FEATURE_DISABLED'
          )
        );
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}
