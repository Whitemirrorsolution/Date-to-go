import type { Request, Response, NextFunction } from 'express';
import { User, type UserRole } from '../models/User.js';
import { tokenService } from '../services/TokenService.js';
import { accessService } from '../services/AccessService.js';
import { AppError } from '../utils/AppError.js';
import { PartnerState, type RoleName, type UserAccessData } from '@date-to-go/access-policy';

// ── Extend Express Request ─────────────────────────────────────────────────

declare global {
  namespace Express {
    interface Request {
      requestId: string;
      user?: {
        id: string;
        roles: UserRole[];
        activeMode: string;
        tokenVersion: number;
        accessVersion: number;
      };
      accessSnapshot?: UserAccessData;
    }
  }
}

// ── authenticate ────────────────────────────────────────────────────────────

/**
 * Verifies the Bearer access token and attaches `req.user`.
 * Validates tokenVersion (for full revocation).
 */
export async function authenticate(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return next(new AppError('Authorization header missing or malformed', 401, 'UNAUTHORIZED'));
  }

  const token = authHeader.slice(7);
  let payload;
  try {
    payload = tokenService.verifyAccessToken(token);
  } catch (err) {
    return next(err);
  }

  // Fast check: we don't always hit DB here, but if tokenVersion must be verified:
  const user = await User.findById(payload.sub).select('roles activeMode tokenVersion accessVersion status');
  if (!user) {
    return next(new AppError('User not found', 401, 'UNAUTHORIZED'));
  }

  if (user.tokenVersion !== payload.tokenVersion) {
    return next(new AppError('Session invalidated. Please log in again.', 401, 'SESSION_REVOKED'));
  }

  if (user.accessVersion !== payload.av) {
    return next(new AppError('Access permissions changed. Please refresh.', 401, 'ACCESS_CHANGED'));
  }

  req.user = {
    id: payload.sub,
    roles: user.roles,
    activeMode: user.activeMode,
    tokenVersion: user.tokenVersion,
    accessVersion: user.accessVersion,
  };

  next();
}

/** Legacy alias for authenticate */
export const requireAuth = authenticate;

// ── loadAccessSnapshot Middleware ──────────────────────────────────────────

export async function attachAccessSnapshot(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  if (!req.user) return next(new AppError('Unauthorized', 401, 'UNAUTHORIZED'));
  try {
    req.accessSnapshot = await accessService.loadAccessSnapshot(req.user.id);
    next();
  } catch (error) {
    next(error);
  }
}

// ── requireRole ────────────────────────────────────────────────────────────

/** Requires one of the specified roles. */
export function requireRole(...roleGroups: (RoleName | readonly RoleName[])[]) {
  const roles = roleGroups.flatMap((roleGroup) =>
    Array.isArray(roleGroup) ? roleGroup : [roleGroup],
  );
  return [
    attachAccessSnapshot,
    (req: Request, _res: Response, next: NextFunction): void => {
      const snap = req.accessSnapshot;
      if (!snap) return next(new AppError('Unauthorized', 401, 'UNAUTHORIZED'));

      if (snap.roles.includes('ADMIN' as any)) return next();

      const hasRole = roles.some((role) => snap.roles.includes(role));
      if (!hasRole) {
        return next(new AppError('Forbidden: Insufficient role', 403, 'WRONG_ROLE'));
      }
      next();
    }
  ];
}

// ── requireEntitlement ─────────────────────────────────────────────────────

export function requireEntitlement(audience: 'SEEKER' | 'PARTNER') {
  return [
    attachAccessSnapshot,
    (req: Request, _res: Response, next: NextFunction): void => {
      const snap = req.accessSnapshot;
      if (!snap) return next(new AppError('Unauthorized', 401, 'UNAUTHORIZED'));

      if (snap.roles.includes('ADMIN' as any)) return next();

      const ent = audience === 'SEEKER' ? snap.entitlements.seeker : snap.entitlements.partner;

      if (!ent.active) {
        const code = audience === 'PARTNER' ? 'PARTNER_PLAN_REQUIRED' : 'SEEKER_PLAN_REQUIRED';
        return next(new AppError(`Forbidden: Active ${audience} subscription required`, 402, code));
      }

      next();
    }
  ];
}

// ── requirePartnerState ────────────────────────────────────────────────────

export function requirePartnerState(allowedStates: PartnerState[]) {
  return [
    attachAccessSnapshot,
    (req: Request, _res: Response, next: NextFunction): void => {
      const snap = req.accessSnapshot;
      if (!snap) return next(new AppError('Unauthorized', 401, 'UNAUTHORIZED'));

      if (snap.roles.includes('ADMIN' as any)) return next();

      if (!allowedStates.includes(snap.partner.onboardingState)) {
        return next(new AppError(`Forbidden: Invalid partner state. Current: ${snap.partner.onboardingState}`, 403, 'STATE_NOT_ALLOWED'));
      }

      next();
    }
  ];
}

// ── requireActiveAccount ───────────────────────────────────────────────────

export function requireActiveAccount(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const snap = req.accessSnapshot;
  if (!snap) return next(new AppError('Unauthorized', 401, 'UNAUTHORIZED'));

  if (snap.accountStatus !== 'ACTIVE') {
    return next(new AppError('Account is not active.', 403, 'ACCOUNT_NOT_ACTIVE'));
  }
  next();
}

// ── requireCompleteProfile ────────────────────────────────────────────────
/**
 * Strict barrier: Incomplete profiles receive 403 Forbidden on core endpoints.
 */
export const requireCompleteProfile = [
  attachAccessSnapshot,
  (req: Request, _res: Response, next: NextFunction): void => {
    const snap = req.accessSnapshot;
    if (!snap) return next(new AppError('Unauthorized', 401, 'UNAUTHORIZED'));

    if (snap.roles.includes('ADMIN' as any)) return next();

    if (snap.onboardingState && snap.onboardingState !== 'LIVE') {
      const err = new AppError('Incomplete profile. Please complete onboarding.', 403, 'ONBOARDING_INCOMPLETE');
      (err as any).currentStep = snap.currentStep;
      (err as any).nextRoute = snap.nextRoute;
      return next(err);
    }
    next();
  }
];

// Legacy bypasses - mostly mapped to snapshot logic now
export const requireVerifiedPhone = requireActiveAccount;
// TODO: Temporarily allowing IN_REVIEW and PROFILE_INCOMPLETE for testing purposes. Revert to ['LIVE'] in production.
export const requireVerifiedKyc = requirePartnerState(['LIVE', 'IN_REVIEW', 'PROFILE_INCOMPLETE'] as PartnerState[]);
export const requireActivePlan = requireEntitlement('SEEKER'); // Or check Both? Handled via specific routers.
