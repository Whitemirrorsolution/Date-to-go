/**
 * StrikeLadderService — Progressive Consequence Ladder for Policy Violations.
 * Manages Nudge -> Cooldown -> Warning -> Chat Restriction -> Suspension ladder
 * and user appeal workflows.
 */

import { UserStrike, type IUserStrike, type StrikeType } from '../../models/UserStrike.js';
import { User } from '../../models/User.js';
import { AuditLog } from '../../models/AuditLog.js';
import { Notification } from '../../models/Notification.js';
import { AppError } from '../../utils/AppError.js';
import { logger } from '../../utils/logger.js';

export interface StrikeOutcome {
  strike: IUserStrike;
  strikeCount: number;
  type: StrikeType;
  userMessage: string;
  cooldownExpiresAt?: Date | undefined;
  expiresAt?: Date | undefined;
}

export class StrikeLadderService {
  /**
   * Check if a user is currently in a chat cooldown or restriction.
   */
  public static async checkUserCooldown(userId: string): Promise<{
    isMuted: boolean;
    remainingMinutes?: number | undefined;
    reason?: string | undefined;
  }> {
    const now = new Date();
    const activeStrike = await UserStrike.findOne({
      userId,
      expiresAt: { $gt: now },
      appealStatus: { $ne: 'APPROVED' },
    }).sort({ expiresAt: -1 });

    if (!activeStrike || !activeStrike.expiresAt) {
      return { isMuted: false };
    }

    const remainingMs = activeStrike.expiresAt.getTime() - now.getTime();
    const remainingMinutes = Math.max(1, Math.ceil(remainingMs / (1000 * 60)));

    return {
      isMuted: true,
      remainingMinutes,
      reason: activeStrike.reason,
    };
  }

  /**
   * Records a blocked circumvention attempt and determines the progressive consequence.
   */
  public static async recordViolation(params: {
    userId: string;
    ruleIds: string[];
    score: number;
    reason: string;
  }): Promise<StrikeOutcome> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // Count non-approved strikes in the last 30 days
    const priorStrikesCount = await UserStrike.countDocuments({
      userId: params.userId,
      createdAt: { $gte: thirtyDaysAgo },
      appealStatus: { $ne: 'APPROVED' },
    });

    const strikeIndex = priorStrikesCount + 1; // 1-indexed

    let type: StrikeType = 'NUDGE';
    let expiresAt: Date | undefined = undefined;
    let userMessage = '';

    if (strikeIndex === 1) {
      type = 'NUDGE';
      userMessage =
        'Reminder: Sharing contact details, phone numbers, or off-platform payment info is not permitted on Date to Go. Please keep communication on-platform for your safety and payment protection.';
    } else if (strikeIndex === 2) {
      type = 'COOLDOWN';
      // 15-minute cooldown
      expiresAt = new Date(Date.now() + 15 * 60 * 1000);
      userMessage =
        'Notice: Repeated contact sharing attempts result in temporary chat restrictions. You are placed in a 15-minute chat cooldown.';
    } else if (strikeIndex === 3) {
      type = 'WARNING';
      // 2-hour cooldown
      expiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000);
      userMessage =
        'Warning: Multiple circumvention attempts detected. You have been placed in a 2-hour chat restriction.';
    } else if (strikeIndex === 4) {
      type = 'CHAT_RESTRICTION';
      // 24-hour restriction
      expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      userMessage =
        'Chat Restricted: Your account has been restricted from sending chat messages for 24 hours due to persistent policy violations.';
    } else {
      type = 'SUSPENSION';
      // Indefinite / Auto-suspend
      expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      userMessage =
        'Account Suspended: Persistent platform policy violations have led to an account suspension. You may submit an appeal to support.';

      // Update User status in database
      await User.findByIdAndUpdate(params.userId, { status: 'SUSPENDED' });
    }

    const strike = await UserStrike.create({
      userId: params.userId,
      type,
      reason: params.reason,
      ruleIds: params.ruleIds,
      expiresAt,
      appealed: false,
    });

    // Create Audit Log
    await AuditLog.create({
      userId: params.userId,
      action: `STRIKE_${type}`,
      resourceType: 'UserStrike',
      resourceId: strike._id.toString(),
      metadata: {
        strikeIndex,
        ruleIds: params.ruleIds,
        score: params.score,
        reason: params.reason,
        expiresAt,
      },
    });

    // Notify user
    await Notification.create({
      userId: params.userId,
      title: `Policy Notice: ${type}`,
      body: userMessage,
      type: 'SYSTEM',
    });

    logger.warn(
      { userId: params.userId, type, strikeIndex, ruleIds: params.ruleIds },
      'User strike recorded'
    );

    return {
      strike,
      strikeCount: strikeIndex,
      type,
      userMessage,
      expiresAt,
    };
  }

  /**
   * User submits an appeal for a strike.
   */
  public static async submitAppeal(params: {
    strikeId: string;
    userId: string;
    reason: string;
  }): Promise<IUserStrike> {
    const strike = await UserStrike.findOne({
      _id: params.strikeId,
      userId: params.userId,
    });

    if (!strike) {
      throw new AppError('Strike record not found', 404, 'STRIKE_NOT_FOUND');
    }

    if (strike.appealed && strike.appealStatus === 'PENDING') {
      throw new AppError('An appeal is already pending review for this strike', 400, 'APPEAL_ALREADY_PENDING');
    }

    strike.appealed = true;
    strike.appealReason = params.reason;
    strike.appealStatus = 'PENDING';
    await strike.save();

    await AuditLog.create({
      userId: params.userId,
      action: 'STRIKE_APPEAL_SUBMITTED',
      resourceType: 'UserStrike',
      resourceId: strike._id.toString(),
      metadata: { reason: params.reason },
    });

    return strike;
  }

  /**
   * Admin reviews and approves or rejects an appeal.
   */
  public static async reviewAppeal(params: {
    strikeId: string;
    adminId: string;
    approved: boolean;
  }): Promise<IUserStrike> {
    const strike = await UserStrike.findById(params.strikeId);
    if (!strike) {
      throw new AppError('Strike record not found', 404, 'STRIKE_NOT_FOUND');
    }

    strike.appealStatus = params.approved ? 'APPROVED' : 'REJECTED';
    strike.reviewedBy = params.adminId as any;
    strike.reviewedAt = new Date();

    if (params.approved) {
      // Lift cooldown immediately
      strike.expiresAt = new Date();

      // If user was suspended by this strike, restore status if no other active suspensions
      const user = await User.findById(strike.userId);
      if (user && user.status === 'SUSPENDED') {
        user.status = 'ACTIVE';
        await user.save();
      }
    }

    await strike.save();

    await AuditLog.create({
      userId: params.adminId,
      action: params.approved ? 'STRIKE_APPEAL_APPROVED' : 'STRIKE_APPEAL_REJECTED',
      resourceType: 'UserStrike',
      resourceId: strike._id.toString(),
      metadata: { strikeUserId: strike.userId, approved: params.approved },
    });

    return strike;
  }
}
