/**
 * KycService — orchestrates KYC flow via pluggable KycProvider.
 *
 * Rules:
 * - Only store providerRefId + timestamps + status in our DB (on User model)
 * - NEVER store Aadhaar, PAN, or raw document images
 * - Webhook endpoint must verify provider signature before calling handleWebhook
 * - Require PARTNER role and ACTIVE account for KYC initiation
 */
import { User } from '../models/User.js';
import { AuditLog } from '../models/AuditLog.js';
import { AppError } from '../utils/AppError.js';
import { logger } from '../utils/logger.js';
import { kycProvider } from '../providers/index.js';

export class KycService {
  async startKyc(userId: string): Promise<{ redirectUrl?: string; providerRefId: string }> {
    const user = await User.findById(userId).select('roles status kycStatus');

    if (!user) throw new AppError('User not found', 404, 'NOT_FOUND');
    if (!user.roles.includes('PARTNER')) throw new AppError('KYC is only required for Partners', 403, 'FORBIDDEN');
    if (user.status !== 'ACTIVE') throw new AppError('Account must be active to start KYC', 403, 'ACCOUNT_NOT_ACTIVE');
    if (user.kycStatus === 'VERIFIED') throw new AppError('KYC already verified', 409, 'KYC_ALREADY_VERIFIED');

    const session = await kycProvider.startSession(userId);

    await User.updateOne(
      { _id: userId },
      {
        kycStatus: 'PENDING',
        kycProviderRefId: session.providerRefId,
        kycStartedAt: new Date(),
      },
    );

    await AuditLog.create({
      actorId: userId,
      action: 'KYC_STARTED',
      entityType: 'User',
      entityId: userId,
      meta: { providerRefId: session.providerRefId },
    });

    logger.info({ userId, providerRefId: session.providerRefId }, 'KYC session started');

    return session;
  }

  async getStatus(userId: string): Promise<{
    kycStatus: string;
    kycProviderRefId?: string | undefined;
    kycStartedAt?: Date | undefined;
    kycCompletedAt?: Date | undefined;
  }> {
    const user = await User.findById(userId).select(
      'kycStatus kycProviderRefId kycStartedAt kycCompletedAt',
    );
    if (!user) throw new AppError('User not found', 404, 'NOT_FOUND');

    return {
      kycStatus: user.kycStatus,
      kycProviderRefId: user.kycProviderRefId,
      kycStartedAt: user.kycStartedAt,
      kycCompletedAt: user.kycCompletedAt,
    };
  }

  /**
   * Handle a provider webhook/callback.
   * In production: verify HMAC signature from provider before calling this.
   */
  async handleWebhook(payload: unknown): Promise<void> {
    const result = await kycProvider.handleWebhook(payload);

    const user = await User.findOne({ kycProviderRefId: result.providerRefId }).select('_id kycStatus');

    if (!user) {
      logger.warn({ providerRefId: result.providerRefId }, 'KYC webhook: no user found for providerRefId');
      return;
    }

    const userId = (user._id as { toString(): string }).toString();

    await User.updateOne(
      { _id: userId },
      {
        kycStatus: result.status,
        kycCompletedAt: new Date(),
      },
    );

    await AuditLog.create({
      actorId: userId,
      action: result.status === 'VERIFIED' ? 'KYC_VERIFIED' : 'KYC_REJECTED',
      entityType: 'User',
      entityId: userId,
      meta: {
        providerRefId: result.providerRefId,
        rejectionReason: result.rejectionReason,
      },
    });

    logger.info({ userId, kycStatus: result.status }, 'KYC status updated from webhook');
  }
}

export const kycService = new KycService();
