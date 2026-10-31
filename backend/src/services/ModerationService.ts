/**
 * ModerationService — Enforces 100% Platonic Code of Conduct and Anti-Escort policy.
 * Scans bio text, profile descriptions, and chat messages for:
 * 1. Banned sexual / escort / adult solicitation keywords.
 * 2. Contact details & off-platform redirect patterns (phone numbers, emails, social handles, links, "DM me").
 *
 * Also handles: block/unblock, report submission, auto-suspension thresholds.
 */
import mongoose from 'mongoose';
import { AppError } from '../utils/AppError.js';
import { logger } from '../utils/logger.js';
import { Block } from '../models/Block.js';
import { User } from '../models/User.js';
import { Report, type ReportReason, type ReportContext } from '../models/Report.js';
import { Notification } from '../models/Notification.js';
import { AuditLog } from '../models/AuditLog.js';
import { BlockedAttempt } from '../models/BlockedAttempt.js';
import { RuleEngine } from './moderation/RuleEngine.js';
import { CrossMessageDetector } from './moderation/CrossMessageDetector.js';
import { StrikeLadderService, type StrikeOutcome } from './moderation/StrikeLadderService.js';

// SLA hours per priority (configurable)
export const SLA_HOURS: Record<string, number> = {
  CRITICAL: 2,
  HIGH: 8,
  MEDIUM: 24,
  LOW: 72,
};

// Auto-suspension thresholds by reason
const AUTO_SUSPEND_THRESHOLDS: Partial<Record<ReportReason, number>> = {
  SEXUAL_SOLICITATION: 2,
  CONTACT_SHARING: 5,
  PAYMENT_BYPASS: 3,
  FRAUD: 2,
  UNDERAGE: 1,
  HARASSMENT: 3,
  SAFETY_CONCERN: 2,
};

export interface ModerationResult {
  isClean: boolean;
  containsBannedKeywords: boolean;
  containsContactInfo: boolean;
  flaggedKeywords: string[];
  redactedText: string;
}

export class ModerationService {
  // Banned sexual, escort, or non-platonic terms
  private bannedKeywords: RegExp[] = [
    /\b(escort|escorts|callgirl|call\s*girl|gigolo|hookup|hook\s*up)\b/i,
    /\b(massage\s*parlor|happy\s*ending|erotic|sensual\s*massage|body\s*rub)\b/i,
    /\b(paid\s*sex|sex\s*work|sexual\s*service|adult\s*service|physical\s*intimacy)\b/i,
    /\b(one\s*night\s*stand|casual\s*encounter|friends\s*with\s*benefits|fwb)\b/i,
    /\b(nude|nudes|nsfw|sex|intercourse|prostitution|brothel)\b/i,
  ];

  // Contact sharing / off-platform solicitation patterns
  private phonePatterns: RegExp[] = [
    /(?:\+?91[\s-]?)?[6-9]\d{9}\b/g, // Indian mobile numbers
    /\b\d{5}[\s-]?\d{5}\b/g,
    /\b\d{3}[\s-]?\d{3}[\s-]?\d{4}\b/g,
    /\b(zero|one|two|three|four|five|six|seven|eight|nine)[\s-]+(zero|one|two|three|four|five|six|seven|eight|nine)/gi, // spelled out numbers
  ];

  private emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,7}\b/g;

  private socialPatterns: RegExp[] = [
    /\b(insta|instagram|ig|telegram|tg|snapchat|snap|whatsapp|wa|wechat)\b/i,
    /@([a-zA-Z0-9_]{3,30})/g, // social handles
    /\b(dm\s*me|dm\s*on|message\s*on|msg\s*on|ping\s*on|reach\s*(?:out\s*)?on|call\s*me\s*at)\b/i,
    /(?:https?:\/\/|www\.)[^\s]+/gi, // URLs
    /\b(?:wa\.me|t\.me|bit\.ly|tinyurl\.com)\/[^\s]+/gi,
  ];

  /**
   * Scans text and returns moderation outcome.
   */
  filterText(text: string): ModerationResult {
    if (!text || typeof text !== 'string') {
      return {
        isClean: true,
        containsBannedKeywords: false,
        containsContactInfo: false,
        flaggedKeywords: [],
        redactedText: '',
      };
    }

    const flaggedKeywords: string[] = [];
    let containsBannedKeywords = false;
    let containsContactInfo = false;
    let redactedText = text;

    // Check banned keywords
    for (const regex of this.bannedKeywords) {
      const match = text.match(regex);
      if (match) {
        containsBannedKeywords = true;
        flaggedKeywords.push(match[0]);
        redactedText = redactedText.replace(regex, '[BANNED CONTENT]');
      }
    }

    // Check phone numbers
    for (const regex of this.phonePatterns) {
      if (regex.test(text)) {
        containsContactInfo = true;
        flaggedKeywords.push('PHONE_NUMBER');
        redactedText = redactedText.replace(regex, '[PHONE REDACTED]');
      }
    }

    // Check email addresses
    if (this.emailPattern.test(text)) {
      containsContactInfo = true;
      flaggedKeywords.push('EMAIL_ADDRESS');
      redactedText = redactedText.replace(this.emailPattern, '[EMAIL REDACTED]');
    }

    // Check social handles and off-platform keywords
    for (const regex of this.socialPatterns) {
      if (regex.test(text)) {
        containsContactInfo = true;
        flaggedKeywords.push('OFF_PLATFORM_HANDLE');
        redactedText = redactedText.replace(regex, '[HANDLE REDACTED]');
      }
    }

    const isClean = !containsBannedKeywords && !containsContactInfo;

    return {
      isClean,
      containsBannedKeywords,
      containsContactInfo,
      flaggedKeywords: Array.from(new Set(flaggedKeywords)),
      redactedText,
    };
  }

  /**
   * Validates profile bio text and throws 400 AppError if non-compliant.
   */
  validateProfileBio(bio: string): void {
    const result = this.filterText(bio);

    if (result.containsBannedKeywords) {
      logger.warn({ flagged: result.flaggedKeywords }, 'Profile bio rejected due to banned keywords');
      throw new AppError(
        'Profile contains prohibited words. Date to Go is strictly a 100% platonic companion platform.',
        400,
        'PROHIBITED_CONTENT',
      );
    }

    if (result.containsContactInfo) {
      logger.warn({ flagged: result.flaggedKeywords }, 'Profile bio rejected due to contact info');
      throw new AppError(
        'Sharing personal contact details, phone numbers, email, or social media handles in your public bio is strictly prohibited for safety reasons.',
        400,
        'CONTACT_INFO_NOT_ALLOWED',
      );
    }
  }

  /**
   * Advanced multi-layer chat moderation pipeline:
   * 1. Checks user cooldown / active strike mute
   * 2. Evaluates text via Normalizer + AllowlistFilter + RuleEngine
   * 3. Performs cross-message evasion detection
   * 4. If blocked: logs BlockedAttempt, updates StrikeLadderService, returns user notice
   */
  async evaluateChatMessage(params: {
    text: string;
    senderId?: string | undefined;
    bookingId?: string | undefined;
    conversationId?: string | undefined;
  }): Promise<{
    decision: 'ALLOW' | 'ALLOW_AND_FLAG' | 'BLOCK';
    score: number;
    ruleIds: string[];
    reasons: string[];
    userNotice?: string | undefined;
    strikeOutcome?: StrikeOutcome | undefined;
  }> {
    if (params.senderId) {
      const cooldown = await StrikeLadderService.checkUserCooldown(params.senderId);
      if (cooldown.isMuted) {
        throw new AppError(
          `You are temporarily in a chat cooldown (${cooldown.remainingMinutes} min remaining). Reason: ${cooldown.reason || 'Safety policy restriction'}`,
          403,
          'CHAT_COOLDOWN'
        );
      }
    }

    const evaluation = await RuleEngine.evaluate(params.text);

    // Cross-message check if bookingId and senderId provided
    if (params.bookingId && params.senderId) {
      const crossCheck = await CrossMessageDetector.checkSenderRecent(
        params.bookingId,
        params.senderId,
        params.text
      );
      if (crossCheck.isEvasion) {
        evaluation.decision = 'BLOCK';
        evaluation.score += 100;
        if (crossCheck.ruleId) evaluation.ruleIds.push(crossCheck.ruleId);
        if (crossCheck.reason) evaluation.reasons.push(crossCheck.reason);
        evaluation.userNotice = evaluation.userNotice ?? 'Split contact details detected across consecutive messages.';
      }
    }

    if (evaluation.decision === 'BLOCK' && params.senderId) {
      await BlockedAttempt.create({
        userId: params.senderId,
        bookingId: params.bookingId,
        conversationId: params.conversationId,
        normalizedTextExcerpt: params.text.slice(0, 150),
        ruleIds: evaluation.ruleIds,
        score: evaluation.score,
      }).catch((err: unknown) => {
        logger.error({ err }, 'Failed to record BlockedAttempt');
      });

      const strikeOutcome = await StrikeLadderService.recordViolation({
        userId: params.senderId,
        ruleIds: evaluation.ruleIds,
        score: evaluation.score,
        reason: evaluation.reasons.join(', ') || 'Anti-circumvention policy violation',
      });

      return {
        decision: 'BLOCK',
        score: evaluation.score,
        ruleIds: evaluation.ruleIds,
        reasons: evaluation.reasons,
        userNotice: `${strikeOutcome.userMessage} (Strike ${strikeOutcome.strikeCount})`,
        strikeOutcome,
      };
    }

    return evaluation;
  }

  /**
   * Validates chat message text synchronously (legacy fallback).
   */
  validateChatMessage(text: string): { text: string; flagged: boolean } {
    const result = this.filterText(text);

    if (result.containsBannedKeywords) {
      throw new AppError(
        'Message blocked: Sexual or escort-related solicitation violates the 100% Platonic Code of Conduct.',
        400,
        'PROHIBITED_MESSAGE',
      );
    }

    if (result.containsContactInfo) {
      throw new AppError(
        'Message blocked: Exchanging phone numbers, emails, or social handles is not allowed before in-person meeting for user safety.',
        400,
        'CONTACT_INFO_PROHIBITED',
      );
    }

    return {
      text: result.redactedText,
      flagged: !result.isClean,
    };
  }
  /**
   * Submit a user report (from profile, booking, chat, or review).
   */
  async submitReport(params: {
    reporterId: string;
    targetUserId: string;
    context: ReportContext;
    reason: ReportReason;
    details: string;
    evidenceUrls?: string[];
    bookingId?: string;
    messageId?: string;
  }) {
    if (params.reporterId === params.targetUserId) {
      throw new AppError('Cannot report yourself', 400, 'INVALID_REPORT');
    }

    const criticalReasons: ReportReason[] = ['SEXUAL_SOLICITATION', 'SAFETY_CONCERN', 'UNDERAGE'];
    const highReasons: ReportReason[] = ['FRAUD', 'HARASSMENT', 'PAYMENT_BYPASS'];
    const priority = criticalReasons.includes(params.reason)
      ? 'CRITICAL'
      : highReasons.includes(params.reason) ? 'HIGH' : 'MEDIUM';

    const slaDeadline = new Date(Date.now() + SLA_HOURS[priority] * 60 * 60 * 1000);

    const report = await Report.create({
      reporterId: params.reporterId,
      targetUserId: params.targetUserId,
      context: params.context,
      reason: params.reason,
      details: params.details,
      evidenceUrls: params.evidenceUrls || [],
      bookingId: params.bookingId,
      messageId: params.messageId,
      priority,
      slaDeadline,
      status: 'OPEN',
    });

    await Notification.create({
      userId: params.reporterId,
      title: 'Report Submitted',
      body: 'Your report has been received and will be reviewed by our safety team within the defined SLA.',
      type: 'SYSTEM',
    });

    await this.checkAndSuspendIfThreshold(params.targetUserId, params.reason);

    logger.info({ reportId: report._id, reason: params.reason, priority }, 'Report submitted');
    return report;
  }

  /**
   * Auto-suspend if threshold reached.
   */
  private async checkAndSuspendIfThreshold(userId: string, reason: ReportReason, session?: mongoose.ClientSession) {
    const threshold = AUTO_SUSPEND_THRESHOLDS[reason];
    if (!threshold) return;

    const reportCount = await Report.countDocuments({
      targetUserId: userId,
      reason,
      status: { $nin: ['DISMISSED'] },
    });

    if (reportCount >= threshold) {
      await User.findByIdAndUpdate(userId, { status: 'SUSPENDED' }, session ? { session } : {});

      await AuditLog.create({
        userId,
        action: 'AUTO_SUSPENDED',
        resourceType: 'User',
        resourceId: userId,
        metadata: { reason, reportCount, threshold },
      });

      await Notification.create({
        userId,
        title: 'Account Suspended',
        body: 'Your account has been automatically suspended due to repeated policy violations. You may appeal via the Help section.',
        type: 'SYSTEM',
      });

      logger.error({ userId, reason, reportCount }, 'User auto-suspended');
    }
  }

  /**
   * Block a user.
   */
  async blockUser(blockerId: string, blockedId: string) {
    if (blockerId === blockedId) throw new AppError('Cannot block yourself', 400);
    try {
      await Block.create({ userId: blockerId, blockedUserId: blockedId });
    } catch (err: any) {
      if (err.code === 11000) throw new AppError('Already blocked', 409, 'ALREADY_BLOCKED');
      throw err;
    }
    await AuditLog.create({
      userId: blockerId,
      action: 'USER_BLOCKED',
      resourceType: 'User',
      resourceId: blockedId,
      metadata: { blockerId, blockedId },
    });
    return { success: true };
  }

  /**
   * Unblock a user.
   */
  async unblockUser(blockerId: string, blockedId: string) {
    const deleted = await Block.findOneAndDelete({ userId: blockerId, blockedUserId: blockedId });
    if (!deleted) throw new AppError('Block not found', 404);
    return { success: true };
  }

  /**
   * Get blocks for a user.
   */
  async getBlockList(userId: string) {
    return Block.find({ userId })
      .populate('blockedUserId', 'fullName email')
      .sort({ createdAt: -1 });
  }

  /**
   * Check if a block exists between any direction of two users.
   */
  async isBlocked(userAId: string, userBId: string): Promise<boolean> {
    const block = await Block.findOne({
      $or: [
        { userId: userAId, blockedUserId: userBId },
        { userId: userBId, blockedUserId: userAId },
      ],
    });
    return !!block;
  }
}

export const moderationService = new ModerationService();
