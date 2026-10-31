/**
 * TokenService — issues/verifies JWTs and manages refresh token lifecycle.
 *
 * Strategy:
 * - Access token: signed JWT, 15 min, contains { sub, role, tokenVersion }
 * - Refresh token: opaque UUID, hashed (SHA-256) in DB, sent as httpOnly cookie
 * - Family tracking: each refresh chain shares a family UUID
 *   → If a revoked token is reused, ALL tokens in that family are revoked (reuse-detection)
 * - Token rotation: every /refresh call issues new pair + revokes old token
 */
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import jwt from 'jsonwebtoken';
import type { Response } from 'express';
import { env, isProd } from '../config/env.js';
import { RefreshToken } from '../models/RefreshToken.js';
import { AppError } from '../utils/AppError.js';
import type { UserRole } from '../models/User.js';

// ── Types ──────────────────────────────────────────────────────────────────

export interface AccessTokenPayload {
  sub: string;       // userId
  roles: UserRole[];
  activeMode: string;
  tokenVersion: number;
  av: number; // accessVersion
}

export interface IssueTokensResult {
  accessToken: string;
  refreshTokenRaw: string; // send to client via cookie
}

// ── Helpers ────────────────────────────────────────────────────────────────

const REFRESH_COOKIE = 'dtg_refresh';

function hashToken(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex');
}

function parseExpiry(expiresIn: string): number {
  // Returns ms
  const unit = expiresIn.slice(-1);
  const value = parseInt(expiresIn.slice(0, -1), 10);
  const map: Record<string, number> = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
  return value * (map[unit] ?? 1000);
}

// ── Service ────────────────────────────────────────────────────────────────

export class TokenService {
  /** Sign a new access token */
  signAccessToken(userId: string, roles: UserRole[], activeMode: string, tokenVersion: number, accessVersion: number): string {
    return jwt.sign(
      { sub: userId, roles, activeMode, tokenVersion, av: accessVersion } satisfies AccessTokenPayload,
      env.JWT_ACCESS_SECRET,
      { expiresIn: env.JWT_ACCESS_EXPIRES_IN } as jwt.SignOptions,
    );
  }

  /** Issue a new access + refresh token pair and persist refresh token */
  async issueTokens(
    userId: string,
    roles: UserRole[],
    activeMode: string,
    tokenVersion: number,
    accessVersion: number,
    family?: string,
  ): Promise<IssueTokensResult> {
    // Access token
    const accessToken = this.signAccessToken(userId, roles, activeMode, tokenVersion, accessVersion);

    // Refresh token
    const refreshTokenRaw = uuidv4();
    const tokenHash = hashToken(refreshTokenRaw);
    const tokenFamily = family ?? uuidv4();
    const expiresAt = new Date(Date.now() + parseExpiry(env.JWT_REFRESH_EXPIRES_IN));

    await RefreshToken.create({ userId, tokenHash, family: tokenFamily, expiresAt });

    return { accessToken, refreshTokenRaw };
  }

  /** Set the refresh token as an httpOnly cookie on the response */
  setRefreshCookie(res: Response, rawToken: string): void {
    res.cookie(REFRESH_COOKIE, rawToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'strict',
      domain: env.COOKIE_DOMAIN,
      path: '/api/v1/auth',
      expires: new Date(Date.now() + parseExpiry(env.JWT_REFRESH_EXPIRES_IN)),
    });
  }

  /** Clear the refresh cookie */
  clearRefreshCookie(res: Response): void {
    res.clearCookie(REFRESH_COOKIE, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'strict',
      domain: env.COOKIE_DOMAIN,
      path: '/api/v1/auth',
    });
  }

  /**
   * Rotate a refresh token.
   * To prevent multi-tab race conditions causing random logouts, we no longer rotate the refresh token string on every refresh.
   * We simply issue a new access token and extend the refresh token expiration if needed.
   */
  async rotateRefreshToken(
    rawToken: string,
    roles: UserRole[],
    activeMode: string,
    tokenVersion: number,
    accessVersion: number,
  ): Promise<{ accessToken: string; refreshTokenRaw: string; userId: string }> {
    const tokenHash = hashToken(rawToken);
    const stored = await RefreshToken.findOne({ tokenHash });

    if (!stored) {
      throw new AppError('Invalid refresh token', 401, 'INVALID_REFRESH_TOKEN');
    }

    if (stored.revoked) {
      throw new AppError('Refresh token revoked. Please log in again.', 401, 'TOKEN_REVOKED');
    }

    if (stored.expiresAt < new Date()) {
      throw new AppError('Refresh token expired', 401, 'REFRESH_TOKEN_EXPIRED');
    }

    // Extend expiration
    stored.expiresAt = new Date(Date.now() + parseExpiry(env.JWT_REFRESH_EXPIRES_IN));
    await stored.save();

    const userId = stored.userId.toString();
    const accessToken = this.signAccessToken(userId, roles, activeMode, tokenVersion, accessVersion);

    return { accessToken, refreshTokenRaw: rawToken, userId };
  }

  /** Verify and decode an access token */
  verifyAccessToken(token: string): AccessTokenPayload {
    try {
      return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
    } catch {
      throw new AppError('Invalid or expired access token', 401, 'INVALID_ACCESS_TOKEN');
    }
  }

  /** Revoke all refresh tokens for a user (logout-all) */
  async revokeAllForUser(userId: string): Promise<void> {
    await RefreshToken.updateMany({ userId, revoked: false }, { revoked: true });
  }

  /** Revoke a single refresh token by raw value */
  async revokeToken(rawToken: string): Promise<void> {
    const tokenHash = hashToken(rawToken);
    await RefreshToken.updateOne({ tokenHash }, { revoked: true });
  }
}

export const tokenService = new TokenService();
