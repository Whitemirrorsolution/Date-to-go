/**
 * AuthService — core authentication business logic.
 *
 * Responsibilities:
 * - Register (USER/PARTNER) with consent, 18+ check, password policy
 * - Login with account lockout after repeated failures
 * - Logout (single session or all sessions)
 * - Refresh token rotation
 * - Forgot/reset password via OTP
 * - Email verification via OTP
 * - Phone OTP send/verify with rate guard
 * - Change password
 * - Soft-delete account
 * - Export user data
 * - Audit logging for security events
 */
import crypto from 'crypto';
import argon2 from 'argon2';
import { v4 as uuidv4 } from 'uuid';
import type { Request, Response } from 'express';
import { env } from '../config/env.js';
import { User } from '../models/User.js';
import { Otp } from '../models/Otp.js';
import { ConsentLog } from '../models/ConsentLog.js';
import { AuditLog } from '../models/AuditLog.js';
import { RefreshToken } from '../models/RefreshToken.js';
import { AppError } from '../utils/AppError.js';
import { logger } from '../utils/logger.js';
import { tokenService } from './TokenService.js';
import { emailProvider, smsProvider } from '../providers/index.js';
import type { UserRole } from '../models/User.js';

// ── Constants ──────────────────────────────────────────────────────────────

const ARGON2_OPTIONS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 4,
};

// ── Helpers ────────────────────────────────────────────────────────────────

/** Generate a cryptographically random 6-digit OTP */
function generateOtp(): string {
  return String(crypto.randomInt(100000, 999999));
}

/** Validate password complexity: min 10 chars, 1 upper, 1 lower, 1 digit, 1 special */
function validatePassword(password: string): void {
  if (password.length < 10) {
    throw new AppError('Password must be at least 10 characters', 400, 'WEAK_PASSWORD');
  }
  if (!/[A-Z]/.test(password)) {
    throw new AppError('Password must contain at least one uppercase letter', 400, 'WEAK_PASSWORD');
  }
  if (!/[a-z]/.test(password)) {
    throw new AppError('Password must contain at least one lowercase letter', 400, 'WEAK_PASSWORD');
  }
  if (!/[0-9]/.test(password)) {
    throw new AppError('Password must contain at least one digit', 400, 'WEAK_PASSWORD');
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    throw new AppError('Password must contain at least one special character', 400, 'WEAK_PASSWORD');
  }
}

/** Check 18+ from DOB */
function validateAge(dob: Date): void {
  const now = new Date();
  const age18 = new Date(dob);
  age18.setFullYear(age18.getFullYear() + 18);
  if (age18 > now) {
    throw new AppError('You must be at least 18 years old to register', 400, 'UNDERAGE');
  }
}

async function getClientIp(req: Request): Promise<string> {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') return forwarded.split(',')[0]?.trim() ?? req.ip ?? 'unknown';
  return req.ip ?? 'unknown';
}

// ── RegisterDTO ────────────────────────────────────────────────────────────

export interface RegisterDto {
  intent: 'Find a partner' | 'Become a partner';
  fullName: string;
  email: string;
  password: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  dob: string; // ISO date string
  city: string;
  acceptedTerms: boolean;
  acceptedPrivacy: boolean;
  acceptedCommunity: boolean;
  phone: string;
  otp: string;
}

export interface LoginDto {
  identifier: string;
  password: string;
}

// ── AuthService ────────────────────────────────────────────────────────────

export class AuthService {
  // ── Register ──────────────────────────────────────────────────────────────

  async register(dto: RegisterDto, req: Request, res: Response): Promise<{ userId: string; accessToken: string }> {
    // Consent must be explicitly accepted
    if (!dto.acceptedTerms || !dto.acceptedPrivacy || !dto.acceptedCommunity) {
      throw new AppError(
        'You must accept the Terms of Service, Privacy Policy, and Community Guidelines',
        400,
        'CONSENT_REQUIRED',
      );
    }

    if (dto.intent !== 'Find a partner' && dto.intent !== 'Become a partner') {
      throw new AppError('Invalid intent', 400, 'INVALID_INTENT');
    }

    // Password policy
    validatePassword(dto.password);

    // 18+ check
    const dob = new Date(dto.dob);
    if (isNaN(dob.getTime())) {
      throw new AppError('Invalid date of birth', 400, 'INVALID_DOB');
    }
    validateAge(dob);

    // Duplicate email check (Mongoose will also throw 11000 but give a cleaner message here)
    // Check for existing email
    const existingEmail = await User.findOne({ email: dto.email.toLowerCase().trim() }).select('_id');
    if (existingEmail) {
      throw new AppError('An account with this email already exists', 409, 'EMAIL_TAKEN');
    }
    // Check for existing phone (ignore onboarding users)
    const existingPhone = await User.findOne({
      phone: dto.phone.toLowerCase().trim(),
      onboardingState: { $ne: 'NEW' },
    }).select('_id');
    if (existingPhone) {
      throw new AppError('An account with this phone number already exists', 409, 'PHONE_TAKEN');
    }

    // Clean up any incomplete onboarding stub for this phone
    await User.deleteMany({
      phone: dto.phone.toLowerCase().trim(),
      onboardingState: 'NEW',
    });

    // Verify OTP first!
    const record = await Otp.findOne({ target: dto.phone.toLowerCase().trim(), type: 'REGISTER_OTP' });
    if (!record || record.expiresAt < new Date()) {
      throw new AppError('OTP expired or not found', 400, 'OTP_EXPIRED');
    }
    if (record.attempts >= env.OTP_MAX_ATTEMPTS) {
      throw new AppError('Too many OTP attempts', 429, 'OTP_MAX_ATTEMPTS');
    }

    const validOtp = await argon2.verify(record.otpHash, dto.otp);
    if (!validOtp) {
      record.attempts += 1;
      await record.save();
      throw new AppError('Invalid OTP', 401, 'INVALID_OTP');
    }
    
    // OTP verified successfully, clean it up
    await record.deleteOne();

    const passwordHash = await argon2.hash(dto.password, ARGON2_OPTIONS);

    const roles: UserRole[] = ['SEEKER'];
    const activeMode = dto.intent === 'Become a partner' ? 'PARTNER' : 'SEEKER';

    const user = await User.create({
      roles,
      activeMode,
      fullName: dto.fullName.trim(),
      email: dto.email.toLowerCase().trim(),
      passwordHash,
      gender: dto.gender,
      dob,
      city: dto.city.trim(),
      status: 'ACTIVE',
      emailVerified: false,
      phone: dto.phone.toLowerCase().trim(),
      phoneVerified: true,
    });

    const userId = (user._id as { toString(): string }).toString();
    const ip = await getClientIp(req);

    // Record consent logs
    await ConsentLog.create([
      { userId, documentType: 'TERMS', pageSlug: 'terms-of-service', version: env.TERMS_VERSION, acceptedAt: new Date(), ip },
      { userId, documentType: 'PRIVACY', pageSlug: 'privacy-policy', version: env.PRIVACY_VERSION, acceptedAt: new Date(), ip },
      { userId, documentType: 'COMMUNITY', pageSlug: 'community-guidelines', version: env.COMMUNITY_GUIDELINES_VERSION, acceptedAt: new Date(), ip },
    ]);

    // Send email verification OTP
    await this.createAndSendEmailOtp(user._id as unknown as import('mongoose').Types.ObjectId, dto.email, 'EMAIL_VERIFY');

    // Issue tokens (initial accessVersion is 1)
    const { accessToken, refreshTokenRaw } = await tokenService.issueTokens(userId, roles, activeMode, 0, 1);

    // Set refresh token in httpOnly cookie (same as login)
    tokenService.setRefreshCookie(res, refreshTokenRaw);

    await AuditLog.create({
      actorId: userId,
      action: 'USER_REGISTERED',
      entityType: 'User',
      entityId: userId,
      meta: { roles, intent: dto.intent },
      ip,
    });

    logger.info({ userId, roles, intent: dto.intent }, 'User registered successfully');

    return { userId, accessToken };
  }

  // ── Register OTP Request ──────────────────────────────────────────────────
  async requestRegisterOtp(dto: Omit<RegisterDto, 'otp'>): Promise<void> {
    const { email, phone, password, dob } = dto;
console.log('🟢 requestRegisterOtp – using delete‑then‑create flow');

    // Validate password
    validatePassword(password);

    // Validate age
    const dobDate = new Date(dob);
    if (isNaN(dobDate.getTime())) {
      throw new AppError('Invalid date of birth', 400, 'INVALID_DOB');
    }
    validateAge(dobDate);

    const existingEmail = await User.findOne({ email: email.toLowerCase().trim() }).select('_id');
    if (existingEmail) {
      throw new AppError('An account with this email already exists', 409, 'EMAIL_TAKEN');
    }

    const existingPhone = await User.findOne({ phone: phone.toLowerCase().trim() }).select('_id');
    if (existingPhone) {
      throw new AppError('An account with this phone already exists', 409, 'PHONE_TAKEN');
    }

    // Dummy user ID for pre-registration OTPs
    const dummyUserId = new (require('mongoose').Types.ObjectId)();
    
    const otp = generateOtp();
    const otpHash = await argon2.hash(otp, ARGON2_OPTIONS);
    const expiresAt = new Date(Date.now() + env.OTP_EXPIRES_MINUTES * 60_000);

    // Remove any existing OTP for this phone and type to avoid duplicate key errors
    await Otp.deleteMany({ target: phone.toLowerCase().trim(), type: 'REGISTER_OTP' });
    // Create new OTP entry
    await Otp.create({
      userId: dummyUserId,
      type: 'REGISTER_OTP',
      target: phone.toLowerCase().trim(),
      otpHash,
      expiresAt,
      attempts: 0,
    });

    await smsProvider.sendOtp(phone, otp, env.OTP_EXPIRES_MINUTES);
  }

  // ── Login ─────────────────────────────────────────────────────────────────

  async login(
    dto: LoginDto,
    req: Request,
    res: Response,
  ): Promise<{ accessToken: string; user: { id: string; roles: UserRole[]; activeMode: string; emailVerified: boolean } }> {
    const ip = await getClientIp(req);

    const user = await User.findOne({
      $or: [
        { email: dto.identifier.toLowerCase().trim() },
        { phone: dto.identifier.trim() },
      ],
    }).select(
      '+passwordHash failedLoginAttempts lockUntil status roles activeMode tokenVersion accessVersion emailVerified',
    );

    // Generic error to prevent user enumeration
    if (!user) {
      throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    // Account lockout check
    if (user.lockUntil && user.lockUntil > new Date()) {
      const secondsLeft = Math.ceil((user.lockUntil.getTime() - Date.now()) / 1000);
      throw new AppError(
        `Account locked. Try again in ${secondsLeft} seconds.`,
        423,
        'ACCOUNT_LOCKED',
      );
    }

    // Deleted account
    if (user.status === 'DELETED') {
      throw new AppError('This account has been deleted', 403, 'ACCOUNT_DELETED');
    }

    // Suspended account
    if (user.status === 'SUSPENDED') {
      throw new AppError('This account has been suspended. Contact support.', 403, 'ACCOUNT_SUSPENDED');
    }

    const passwordValid = await argon2.verify(user.passwordHash, dto.password);

    if (!passwordValid) {
      user.failedLoginAttempts += 1;

      if (user.failedLoginAttempts >= env.ACCOUNT_LOCK_ATTEMPTS) {
        user.lockUntil = new Date(Date.now() + env.ACCOUNT_LOCK_DURATION_MS);
        user.failedLoginAttempts = 0;
        await user.save();

        await AuditLog.create({
          actorId: user._id,
          action: 'ACCOUNT_LOCKED',
          entityType: 'User',
          entityId: user._id,
          meta: { reason: 'Too many failed login attempts' },
          ip,
        });

        throw new AppError(
          `Too many failed attempts. Account locked for ${env.ACCOUNT_LOCK_DURATION_MS / 60000} minutes.`,
          423,
          'ACCOUNT_LOCKED',
        );
      }

      await user.save();
      throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    // Success — reset lockout counters
    user.failedLoginAttempts = 0;
    user.lockUntil = undefined;
    user.lastLoginAt = new Date();

    // Activate PENDING account on first login
    if (user.status === 'PENDING') {
      user.status = 'ACTIVE';
    }

    await user.save();

    const userId = (user._id as { toString(): string }).toString();

    const { accessToken, refreshTokenRaw } = await tokenService.issueTokens(
      userId,
      user.roles,
      user.activeMode,
      user.tokenVersion,
      user.accessVersion
    );

    tokenService.setRefreshCookie(res, refreshTokenRaw);

    await AuditLog.create({
      actorId: userId,
      action: 'USER_LOGIN',
      entityType: 'User',
      entityId: userId,
      ip,
    });

    logger.info({ userId, roles: user.roles }, 'User logged in');

    return {
      accessToken,
      user: { id: userId, roles: user.roles, activeMode: user.activeMode, emailVerified: user.emailVerified },
    };
  }

  // ── Login with OTP (Existing Users) ────────────────────────────────────────

  async requestLoginOtp(phone: string): Promise<void> {
    let cleanPhone = phone.toLowerCase().trim();
    if (/^\d{10}$/.test(cleanPhone)) {
      cleanPhone = `+91${cleanPhone}`;
    }
    // Find user with either +91 prefixed number or stored without prefix
    const user = await User.findOne({
      $or: [
        { phone: cleanPhone },
        { phone: cleanPhone.replace(/^\+91/, '') },
      ],
    });
    if (!user) {
      throw new AppError('User not found for this phone number', 404, 'USER_NOT_FOUND');
    }
    if (user.status === 'DELETED' || user.status === 'SUSPENDED') {
      throw new AppError('Account unavailable', 403, 'ACCOUNT_UNAVAILABLE');
    }

    // Check rate limit
    const existing = await Otp.findOne({
      $or: [
        { userId: user._id, type: 'LOGIN_OTP' },
        { target: cleanPhone, type: 'LOGIN_OTP' },
      ],
    });
    if (existing && existing.createdAt > new Date(Date.now() - 60_000)) {
      throw new AppError('Please wait 60 seconds before requesting another OTP', 429, 'OTP_RATE_LIMITED');
    }

    const otp = generateOtp();
    const otpHash = await argon2.hash(otp, ARGON2_OPTIONS);
    const expiresAt = new Date(Date.now() + env.OTP_EXPIRES_MINUTES * 60_000);

    // Remove any existing OTP for this user+type to avoid duplicate key errors
    await Otp.deleteMany({
      $or: [
        { userId: user._id, type: 'LOGIN_OTP' },
        { target: cleanPhone, type: 'LOGIN_OTP' },
      ],
    });
    // Create fresh OTP entry
    await Otp.create({
      userId: user._id,
      type: 'LOGIN_OTP',
      target: cleanPhone,
      otpHash,
      expiresAt,
      attempts: 0,
    });

    await smsProvider.sendOtp(cleanPhone, otp, env.OTP_EXPIRES_MINUTES);
  }

  // ── Trunk with OTP (Unified Onboarding / Sign-in) ─────────────────────────

  async requestTrunkOtp(phone: string): Promise<void> {
    let cleanPhone = phone.toLowerCase().trim();
    if (/^\d{10}$/.test(cleanPhone)) {
      cleanPhone = `+91${cleanPhone}`;
    }

    let user = await User.findOne({ phone: cleanPhone });

    if (!user) {
      try {
        user = await User.create({
          phone: cleanPhone,
          onboardingState: 'NEW',
          currentStep: 'PHONE',
          status: 'PENDING',
          roles: ['SEEKER'],
          activeMode: 'SEEKER',
        });
      } catch (err: any) {
        if (err.code === 11000) {
          user = await User.findOne({ phone: cleanPhone });
          if (!user) throw err;
        } else {
          throw err;
        }
      }
    } else {
      if (user.status === 'DELETED' || user.status === 'SUSPENDED') {
        throw new AppError('Account unavailable', 403, 'ACCOUNT_UNAVAILABLE');
      }
    }

    // Check rate limit
    const existing = await Otp.findOne({
      $or: [
        { userId: user._id, type: 'LOGIN_OTP' },
        { target: cleanPhone, type: 'LOGIN_OTP' },
      ],
    });
    if (existing && existing.createdAt > new Date(Date.now() - 60_000)) {
      throw new AppError('Please wait 60 seconds before requesting another OTP', 429, 'OTP_RATE_LIMITED');
    }

    const otp = generateOtp();
    const otpHash = await argon2.hash(otp, ARGON2_OPTIONS);
    const expiresAt = new Date(Date.now() + env.OTP_EXPIRES_MINUTES * 60_000);

    // Remove any existing OTP for this user+type to avoid duplicate key errors
    await Otp.deleteMany({
      $or: [
        { userId: user._id, type: 'LOGIN_OTP' },
        { target: cleanPhone, type: 'LOGIN_OTP' },
      ],
    });
    // Create fresh OTP entry
    await Otp.create({
      userId: user._id,
      type: 'LOGIN_OTP',
      target: cleanPhone,
      otpHash,
      expiresAt,
      attempts: 0,
    });

    await smsProvider.sendOtp(cleanPhone, otp, env.OTP_EXPIRES_MINUTES);
  }

  async verifyLoginOtp(
    phone: string, 
    otp: string,
    req: Request,
    res: Response
  ): Promise<{ accessToken: string; user: any }> {
    let cleanPhone = phone.toLowerCase().trim();
    if (/^\d{10}$/.test(cleanPhone)) {
      cleanPhone = `+91${cleanPhone}`;
    }

    let user = await User.findOne({ phone: cleanPhone }).select(
      '+failedLoginAttempts +lockUntil status roles activeMode tokenVersion accessVersion emailVerified onboardingState currentStep roleForkLocked',
    );
    if (!user) {
      throw new AppError('Invalid OTP', 401, 'INVALID_OTP');
    }

    if (user.lockUntil && user.lockUntil > new Date()) {
      throw new AppError('Account locked', 423, 'ACCOUNT_LOCKED');
    }
    if (user.status === 'DELETED' || user.status === 'SUSPENDED') {
      throw new AppError('Account unavailable', 403, 'ACCOUNT_UNAVAILABLE');
    }

    const record = await Otp.findOne({
      $or: [
        { userId: user._id, type: 'LOGIN_OTP' },
        { target: cleanPhone, type: 'LOGIN_OTP' },
      ],
    });
    if (!record || record.expiresAt < new Date()) {
      throw new AppError('OTP expired or not found', 400, 'OTP_EXPIRED');
    }
    if (record.attempts >= env.OTP_MAX_ATTEMPTS) {
      throw new AppError('Too many OTP attempts', 429, 'OTP_MAX_ATTEMPTS');
    }

    const valid = await argon2.verify(record.otpHash, otp);
    if (!valid) {
      record.attempts += 1;
      await record.save();
      throw new AppError('Invalid OTP', 401, 'INVALID_OTP');
    }

    // Success
    await record.deleteOne();
    user.failedLoginAttempts = 0;
    user.lockUntil = undefined;
    user.lastLoginAt = new Date();
    user.phoneVerified = true;

    // Transition onboarding state: NEW -> PHONE_VERIFIED
    if (user.onboardingState === 'NEW') {
      user.onboardingState = 'PHONE_VERIFIED';
      user.currentStep = 'CONSENT';
    } else if (!user.onboardingState && user.status === 'ACTIVE') {
      user.onboardingState = 'LIVE';
    }

    if (user.status === 'PENDING') user.status = 'ACTIVE';
    await user.save();

    const userId = (user._id as { toString(): string }).toString();
    const { accessToken, refreshTokenRaw } = await tokenService.issueTokens(userId, user.roles, user.activeMode, user.tokenVersion, user.accessVersion);
    tokenService.setRefreshCookie(res, refreshTokenRaw);

    const ip = await getClientIp(req);
    await AuditLog.create({ actorId: userId, action: 'USER_LOGIN', entityType: 'User', entityId: userId, ip });
    logger.info({ userId }, 'User logged in / verified via OTP');

    return {
      accessToken,
      user: {
        id: userId,
        roles: user.roles,
        activeMode: user.activeMode,
        emailVerified: user.emailVerified,
        phoneVerified: user.phoneVerified,
        onboardingState: user.onboardingState,
        currentStep: user.currentStep,
      },
    };
  }

  // ── Logout ────────────────────────────────────────────────────────────────

  async logout(rawRefreshToken: string | undefined, userId: string, res: Response): Promise<void> {
    if (rawRefreshToken) {
      await tokenService.revokeToken(rawRefreshToken);
    }
    tokenService.clearRefreshCookie(res);
    logger.info({ userId }, 'User logged out');
  }

  async logoutAll(userId: string, res: Response): Promise<void> {
    await tokenService.revokeAllForUser(userId);

    // Increment tokenVersion to invalidate all existing access tokens
    await User.updateOne({ _id: userId }, { $inc: { tokenVersion: 1 } });

    tokenService.clearRefreshCookie(res);
    logger.info({ userId }, 'User logged out from all sessions');
  }

  // ── Refresh ───────────────────────────────────────────────────────────────

  async refresh(
    rawRefreshToken: string,
    res: Response,
  ): Promise<{ accessToken: string }> {
    // Use top-level crypto import
    const tokenHash = crypto.createHash('sha256').update(rawRefreshToken).digest('hex');
    const stored = await RefreshToken.findOne({ tokenHash });

    if (!stored || stored.revoked || stored.expiresAt < new Date()) {
      throw new AppError('Invalid or expired refresh token', 401, 'INVALID_REFRESH_TOKEN');
    }

    const user = await User.findById(stored.userId).select('roles activeMode tokenVersion accessVersion status');
    if (!user || user.status === 'DELETED' || user.status === 'SUSPENDED') {
      throw new AppError('Account unavailable', 403, 'ACCOUNT_UNAVAILABLE');
    }

    const { accessToken, refreshTokenRaw, userId } = await tokenService.rotateRefreshToken(
      rawRefreshToken,
      user.roles,
      user.activeMode,
      user.tokenVersion,
      user.accessVersion
    );

    tokenService.setRefreshCookie(res, refreshTokenRaw);
    logger.info({ userId }, 'Refresh token rotated');

    return { accessToken };
  }

  // ── Email OTP ─────────────────────────────────────────────────────────────

  private async createAndSendEmailOtp(
    userId: import('mongoose').Types.ObjectId,
    email: string,
    type: 'EMAIL_VERIFY' | 'PASSWORD_RESET',
  ): Promise<void> {
    const otp = generateOtp();
    const otpHash = await argon2.hash(otp, ARGON2_OPTIONS);
    const expiresAt = new Date(Date.now() + env.OTP_EXPIRES_MINUTES * 60_000);

    // Upsert: replace any existing OTP for this user+type
    await Otp.findOneAndUpdate(
      { userId, type },
      { userId, type, target: email.toLowerCase(), otpHash, expiresAt, attempts: 0 },
      { upsert: true, new: true },
    );

    await emailProvider.sendOtp(email, otp, env.OTP_EXPIRES_MINUTES);
  }

  async verifyEmailOtp(userId: string, otp: string): Promise<void> {
    const record = await Otp.findOne({ userId, type: 'EMAIL_VERIFY' });

    if (!record) {
      throw new AppError('No pending email verification. Request a new OTP.', 400, 'OTP_NOT_FOUND');
    }
    if (record.expiresAt < new Date()) {
      throw new AppError('OTP has expired. Request a new one.', 400, 'OTP_EXPIRED');
    }
    if (record.attempts >= env.OTP_MAX_ATTEMPTS) {
      throw new AppError('Too many OTP attempts. Request a new OTP.', 429, 'OTP_MAX_ATTEMPTS');
    }

    const valid = await argon2.verify(record.otpHash, otp);

    if (!valid) {
      record.attempts += 1;
      await record.save();
      const remaining = env.OTP_MAX_ATTEMPTS - record.attempts;
      throw new AppError(`Invalid OTP. ${remaining} attempt(s) remaining.`, 400, 'INVALID_OTP');
    }

    // Mark verified
    await User.updateOne({ _id: userId }, { emailVerified: true, status: 'ACTIVE' });
    await record.deleteOne();
    logger.info({ userId }, 'Email verified');
  }

  async resendEmailOtp(userId: string, email: string): Promise<void> {
    const userId_obj = (await User.findById(userId).select('_id'))!._id as import('mongoose').Types.ObjectId;
    await this.createAndSendEmailOtp(userId_obj, email, 'EMAIL_VERIFY');
  }

  // ── Phone OTP ─────────────────────────────────────────────────────────────

  async sendPhoneOtp(userId: string, phone: string): Promise<void> {
    // Rate-guard: max 1 OTP per 60 seconds (check existing record)
    const existing = await Otp.findOne({ userId, type: 'PHONE_VERIFY' });
    if (existing && existing.createdAt > new Date(Date.now() - 60_000)) {
      throw new AppError('Please wait 60 seconds before requesting another OTP', 429, 'OTP_RATE_LIMITED');
    }

    const otp = generateOtp();
    const otpHash = await argon2.hash(otp, ARGON2_OPTIONS);
    const expiresAt = new Date(Date.now() + env.OTP_EXPIRES_MINUTES * 60_000);

    await Otp.findOneAndUpdate(
      { userId, type: 'PHONE_VERIFY' },
      { userId, type: 'PHONE_VERIFY', target: phone, otpHash, expiresAt, attempts: 0 },
      { upsert: true, new: true },
    );

    await smsProvider.sendOtp(phone, otp, env.OTP_EXPIRES_MINUTES);
    logger.info({ userId }, 'Phone OTP sent');
  }

  async verifyPhoneOtp(userId: string, phone: string, otp: string): Promise<void> {
    const record = await Otp.findOne({ userId, type: 'PHONE_VERIFY' });

    if (!record || record.target !== phone.toLowerCase()) {
      throw new AppError('No pending phone verification for this number', 400, 'OTP_NOT_FOUND');
    }
    if (record.expiresAt < new Date()) {
      throw new AppError('OTP expired. Request a new one.', 400, 'OTP_EXPIRED');
    }
    if (record.attempts >= env.OTP_MAX_ATTEMPTS) {
      throw new AppError('Too many OTP attempts. Request a new OTP.', 429, 'OTP_MAX_ATTEMPTS');
    }

    const valid = await argon2.verify(record.otpHash, otp);
    if (!valid) {
      record.attempts += 1;
      await record.save();
      const remaining = env.OTP_MAX_ATTEMPTS - record.attempts;
      throw new AppError(`Invalid OTP. ${remaining} attempt(s) remaining.`, 400, 'INVALID_OTP');
    }

    await User.updateOne({ _id: userId }, { phone, phoneVerified: true });
    await record.deleteOne();
    logger.info({ userId }, 'Phone verified');
  }

  // ── Forgot / Reset Password ───────────────────────────────────────────────

  async forgotPassword(email: string): Promise<void> {
    // Always return success to prevent user enumeration
    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('_id email');
    if (!user || !user.email) return;

    const userId_obj = user._id as import('mongoose').Types.ObjectId;
    await this.createAndSendEmailOtp(userId_obj, user.email, 'PASSWORD_RESET');
    logger.info({}, 'Password reset OTP sent');
  }

  async resetPassword(email: string, otp: string, newPassword: string): Promise<void> {
    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('_id');
    if (!user) {
      throw new AppError('Invalid or expired reset token', 400, 'INVALID_RESET_TOKEN');
    }

    const userId = (user._id as { toString(): string }).toString();
    const record = await Otp.findOne({ userId, type: 'PASSWORD_RESET' });

    if (!record || record.expiresAt < new Date()) {
      throw new AppError('OTP expired. Request a new password reset.', 400, 'OTP_EXPIRED');
    }
    if (record.attempts >= env.OTP_MAX_ATTEMPTS) {
      throw new AppError('Too many attempts. Request a new password reset.', 429, 'OTP_MAX_ATTEMPTS');
    }

    const valid = await argon2.verify(record.otpHash, otp);
    if (!valid) {
      record.attempts += 1;
      await record.save();
      throw new AppError('Invalid OTP', 400, 'INVALID_OTP');
    }

    validatePassword(newPassword);
    const passwordHash = await argon2.hash(newPassword, ARGON2_OPTIONS);

    // Increment tokenVersion to invalidate all existing sessions
    await User.updateOne({ _id: userId }, { passwordHash, $inc: { tokenVersion: 1 } });
    await record.deleteOne();
    await tokenService.revokeAllForUser(userId);

    await AuditLog.create({
      actorId: userId,
      action: 'PASSWORD_RESET',
      entityType: 'User',
      entityId: userId,
    });

    logger.info({ userId }, 'Password reset completed');
  }

  // ── Change Password ───────────────────────────────────────────────────────

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
    req: Request,
    res: Response,
  ): Promise<void> {
    const user = await User.findById(userId).select('+passwordHash tokenVersion');
    if (!user) throw new AppError('User not found', 404, 'NOT_FOUND');

    const valid = await argon2.verify(user.passwordHash, currentPassword);
    if (!valid) throw new AppError('Current password is incorrect', 401, 'INVALID_CREDENTIALS');

    validatePassword(newPassword);
    const passwordHash = await argon2.hash(newPassword, ARGON2_OPTIONS);

    await User.updateOne({ _id: userId }, { passwordHash, $inc: { tokenVersion: 1 } });
    await tokenService.revokeAllForUser(userId);
    tokenService.clearRefreshCookie(res);

    const ip = await getClientIp(req);
    await AuditLog.create({
      actorId: userId,
      action: 'PASSWORD_CHANGED',
      entityType: 'User',
      entityId: userId,
      ip,
    });

    logger.info({ userId }, 'Password changed');
  }

  // ── Soft Delete / Anonymise ───────────────────────────────────────────────

  async deleteAccount(userId: string, password: string, res: Response): Promise<void> {
    const user = await User.findById(userId).select('+passwordHash');
    if (!user) throw new AppError('User not found', 404, 'NOT_FOUND');

    const valid = await argon2.verify(user.passwordHash, password);
    if (!valid) throw new AppError('Password confirmation failed', 401, 'INVALID_CREDENTIALS');

    // Soft delete: mark DELETED + anonymise PII immediately
    const anonEmail = `deleted_${uuidv4()}@deleted.invalid`;
    await User.updateOne(
      { _id: userId },
      {
        status: 'DELETED',
        email: anonEmail,
        phone: undefined,
        emergencyContact: undefined,
        $inc: { tokenVersion: 1 },
      },
    );

    await tokenService.revokeAllForUser(userId);
    tokenService.clearRefreshCookie(res);

    await AuditLog.create({
      actorId: userId,
      action: 'ACCOUNT_DELETED',
      entityType: 'User',
      entityId: userId,
    });

    logger.info({ userId }, 'Account soft-deleted and PII anonymised');
  }

  // ── Export Data ───────────────────────────────────────────────────────────

  async exportMyData(userId: string): Promise<Record<string, unknown>> {
    const user = await User.findById(userId).lean();
    if (!user) throw new AppError('User not found', 404, 'NOT_FOUND');

    const consentLogs = await ConsentLog.find({ userId }).lean();

    // Return only non-sensitive fields
    return {
      exportedAt: new Date().toISOString(),
      user: {
        id: user._id,
        roles: user.roles,
        email: user.email,
        gender: user.gender,
        dob: user.dob,
        city: user.city,
        status: user.status,
        emailVerified: user.emailVerified,
        phoneVerified: user.phoneVerified,
        kycStatus: user.kycStatus,
        createdAt: user.createdAt,
      },
      consents: consentLogs.map((c) => ({
        documentType: c.documentType,
        version: c.version,
        acceptedAt: c.acceptedAt,
      })),
    };
  }
}

export const authService = new AuthService();
