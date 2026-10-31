import { PartnerRule, type AutoRuleAction } from '../models/PartnerRule.js';
import { Booking } from '../models/Booking.js';
import { User } from '../models/User.js';
import { Dispute } from '../models/Dispute.js';
import { UserStrike } from '../models/UserStrike.js';
import { getSetting } from '../utils/featureFlags.js';
import { getCentroidFromPincode, haversineDistanceKm } from '../utils/geoUtils.js';
import { logger } from '../utils/logger.js';

export interface RuleEvaluationContext {
  partnerId: string;
  seekerId: string;
  startAt: Date;
  endAt: Date;
  durationMins: number;
  categoryId: string;
  venuePincode?: string | undefined;
  partnerPincode?: string | undefined;
}

export interface RuleEvaluationResult {
  action: AutoRuleAction | 'NO_RULE_FIRED';
  ruleId?: string | undefined;
  ruleName?: string | undefined;
  reason?: string | undefined;
  seekerFacingMessage?: string | undefined;
  safetyCheckPassed?: boolean | undefined;
}

export interface RuleSimulationStep {
  ruleId: string;
  ruleName: string;
  priority: number;
  action: AutoRuleAction;
  conditionsChecked: Array<{
    name: string;
    expected: any;
    actual: any;
    matched: boolean;
  }>;
  overallMatch: boolean;
  actionTaken?: AutoRuleAction | undefined;
  blockedBySafetyConstraint?: boolean | undefined;
}

export class AutoRulesService {
  /**
   * Evaluates partner's rules in priority order against a booking request.
   */
  async evaluateRequest(context: RuleEvaluationContext): Promise<RuleEvaluationResult> {
    const rules = await PartnerRule.find({ partnerId: context.partnerId, enabled: true })
      .sort({ priority: 1, createdAt: 1 })
      .lean();

    if (rules.length === 0) {
      return { action: 'NO_RULE_FIRED' };
    }

    // Seeker signals
    const seeker = await User.findById(context.seekerId).select('kycStatus phoneVerified status createdAt').lean();

    for (const rule of rules) {
      const match = await this.checkRuleConditions(rule, context, seeker);
      if (match) {
        // Evaluate Safety Constraint for AUTO_ACCEPT
        if (rule.action === 'AUTO_ACCEPT') {
          const isTrustedRepeat = await this.verifyTrustedRepeatSeeker(context.partnerId, context.seekerId, seeker);
          if (!isTrustedRepeat) {
            logger.info(
              { partnerId: context.partnerId, seekerId: context.seekerId, ruleId: rule._id },
              'Auto-accept rule matched but skipped: Seeker is not a verified trusted repeat client.'
            );
            continue; // Fall through to next rule or manual review
          }
        }

        // Increment hit count
        await PartnerRule.findByIdAndUpdate(rule._id, {
          $inc: { hitCount: 1 },
          $set: { lastFiredAt: new Date() },
        });

        return {
          action: rule.action,
          ruleId: rule._id.toString(),
          ruleName: rule.name,
          reason: rule.name,
          seekerFacingMessage:
            rule.action === 'AUTO_DECLINE'
              ? 'Not available for this request'
              : 'Request accepted automatically by companion policy',
          safetyCheckPassed: true,
        };
      }
    }

    return { action: 'NO_RULE_FIRED' };
  }

  /**
   * Simulates rules evaluation for partner testing and transparency.
   */
  async simulateRules(partnerId: string, context: RuleEvaluationContext): Promise<RuleSimulationStep[]> {
    const rules = await PartnerRule.find({ partnerId, enabled: true })
      .sort({ priority: 1, createdAt: 1 })
      .lean();

    const seeker = await User.findById(context.seekerId).select('kycStatus phoneVerified status createdAt').lean();
    const steps: RuleSimulationStep[] = [];

    for (const rule of rules) {
      const step: RuleSimulationStep = {
        ruleId: rule._id.toString(),
        ruleName: rule.name,
        priority: rule.priority,
        action: rule.action,
        conditionsChecked: [],
        overallMatch: false,
      };

      const cond = rule.conditions;
      let allMatch = true;

      // 1. Minimum Lead Time
      if (cond.minLeadTimeHours != null) {
        const leadTimeHours = (new Date(context.startAt).getTime() - Date.now()) / (3600 * 1000);
        const passed = leadTimeHours < cond.minLeadTimeHours; // Violates lead time requirement
        step.conditionsChecked.push({
          name: 'Lead Time Below Minimum',
          expected: `< ${cond.minLeadTimeHours} hours`,
          actual: `${leadTimeHours.toFixed(1)} hours`,
          matched: passed,
        });
        if (!passed) allMatch = false;
      }

      // 2. Duration
      if (cond.minDurationMins != null || cond.maxDurationMins != null) {
        const dur = context.durationMins;
        const tooShort = cond.minDurationMins != null && dur < cond.minDurationMins;
        const tooLong = cond.maxDurationMins != null && dur > cond.maxDurationMins;
        const passed = tooShort || tooLong;
        step.conditionsChecked.push({
          name: 'Duration Outside Allowed Range',
          expected: `Outside [${cond.minDurationMins ?? 0}m - ${cond.maxDurationMins ?? '∞'}m]`,
          actual: `${dur}m`,
          matched: passed,
        });
        if (!passed) allMatch = false;
      }

      // 3. Category Filter
      if (cond.allowedCategoryIds && cond.allowedCategoryIds.length > 0) {
        const isAllowed = cond.allowedCategoryIds.some((cid) => cid.toString() === context.categoryId);
        step.conditionsChecked.push({
          name: 'Category Allowed',
          expected: 'In allowed categories',
          actual: context.categoryId,
          matched: isAllowed,
        });
        if (!isAllowed) allMatch = false;
      }

      // 4. Seeker Verification
      if (cond.verifiedSeekersOnly) {
        const isVerified = seeker?.kycStatus === 'VERIFIED' || seeker?.phoneVerified === true;
        step.conditionsChecked.push({
          name: 'Seeker Verification Required',
          expected: 'Verified Seeker',
          actual: isVerified ? 'Verified' : 'Unverified',
          matched: isVerified,
        });
        if (!isVerified) allMatch = false;
      }

      step.overallMatch = allMatch;

      if (allMatch) {
        if (rule.action === 'AUTO_ACCEPT') {
          const isTrusted = await this.verifyTrustedRepeatSeeker(partnerId, context.seekerId, seeker);
          if (!isTrusted) {
            step.blockedBySafetyConstraint = true;
            step.actionTaken = undefined;
          } else {
            step.actionTaken = 'AUTO_ACCEPT';
          }
        } else {
          step.actionTaken = rule.action;
        }
      }

      steps.push(step);
    }

    return steps;
  }

  /**
   * Internal condition evaluator.
   */
  private async checkRuleConditions(
    rule: any,
    context: RuleEvaluationContext,
    seeker: any
  ): Promise<boolean> {
    const cond = rule.conditions;

    // A. Minimum lead time
    if (cond.minLeadTimeHours != null) {
      const adminMinLeadTime = await getSetting<number>('autoRules.minLeadTimeHoursMin', 2);
      const effectiveMinLead = Math.max(cond.minLeadTimeHours, adminMinLeadTime);
      const leadTimeHours = (new Date(context.startAt).getTime() - Date.now()) / (3600 * 1000);
      if (rule.action === 'AUTO_DECLINE') {
        if (leadTimeHours < effectiveMinLead) return true; // Decline if request arrives too late
      } else {
        if (leadTimeHours < effectiveMinLead) return false;
      }
    }

    // B. Category check
    if (cond.allowedCategoryIds && cond.allowedCategoryIds.length > 0) {
      const allowed = cond.allowedCategoryIds.some((c: any) => c.toString() === context.categoryId);
      if (rule.action === 'AUTO_DECLINE' && !allowed) return true;
      if (rule.action === 'AUTO_ACCEPT' && !allowed) return false;
    }

    // C. Duration limits
    if (cond.minDurationMins != null && context.durationMins < cond.minDurationMins) {
      if (rule.action === 'AUTO_DECLINE') return true;
      if (rule.action === 'AUTO_ACCEPT') return false;
    }
    if (cond.maxDurationMins != null && context.durationMins > cond.maxDurationMins) {
      if (rule.action === 'AUTO_DECLINE') return true;
      if (rule.action === 'AUTO_ACCEPT') return false;
    }

    // D. Pincode and Distance limits
    if (cond.allowedPincodes && cond.allowedPincodes.length > 0 && context.venuePincode) {
      const inAllowedList = cond.allowedPincodes.includes(context.venuePincode);
      if (rule.action === 'AUTO_DECLINE' && !inAllowedList) return true;
      if (rule.action === 'AUTO_ACCEPT' && !inAllowedList) return false;
    }

    if (cond.maxDistanceKm != null && context.venuePincode && context.partnerPincode) {
      const c1 = getCentroidFromPincode(context.partnerPincode);
      const c2 = getCentroidFromPincode(context.venuePincode);
      if (c1 && c2) {
        const dist = haversineDistanceKm(c1.lat, c1.lng, c2.lat, c2.lng);
        if (dist > cond.maxDistanceKm) {
          if (rule.action === 'AUTO_DECLINE') return true;
          if (rule.action === 'AUTO_ACCEPT') return false;
        }
      }
    }

    // E. Seeker verification requirement
    if (cond.verifiedSeekersOnly) {
      const isVerified = seeker?.kycStatus === 'VERIFIED' || seeker?.phoneVerified === true;
      if (rule.action === 'AUTO_DECLINE' && !isVerified) return true;
      if (rule.action === 'AUTO_ACCEPT' && !isVerified) return false;
    }

    // F. Conduct checks (no upheld conduct cases in last 12 months)
    if (cond.noUpheldStrikesLast12Months) {
      const oneYearAgo = new Date(Date.now() - 365 * 24 * 3600 * 1000);
      const strikesCount = await UserStrike.countDocuments({
        userId: context.seekerId,
        createdAt: { $gte: oneYearAgo },
      });
      if (strikesCount > 0) {
        if (rule.action === 'AUTO_DECLINE') return true;
        if (rule.action === 'AUTO_ACCEPT') return false;
      }
    }

    // G. Daily / Weekly booking limits
    if (cond.maxDailyBookings != null) {
      const dayStart = new Date(context.startAt);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(context.startAt);
      dayEnd.setHours(23, 59, 59, 999);

      const existingDayCount = await Booking.countDocuments({
        partnerId: context.partnerId,
        stage: { $in: ['ACCEPTED', 'PAID', 'IN_PROGRESS', 'AWAITING_OTP'] },
        startAt: { $gte: dayStart, $lte: dayEnd },
      });

      if (existingDayCount >= cond.maxDailyBookings) {
        if (rule.action === 'AUTO_DECLINE') return true;
        if (rule.action === 'AUTO_ACCEPT') return false;
      }
    }

    return rule.action === 'AUTO_ACCEPT';
  }

  /**
   * Safety Gate for Auto-Accept:
   * Only trusted repeat clients: >= 1 completed booking with this partner, no disputes, verified.
   */
  async verifyTrustedRepeatSeeker(partnerId: string, seekerId: string, seekerDoc?: any): Promise<boolean> {
    // 1. Must be phone verified or KYC verified
    const isVerified = seekerDoc?.kycStatus === 'VERIFIED' || seekerDoc?.phoneVerified === true;
    if (!isVerified) return false;

    // 2. Must have >= 1 COMPLETED booking with THIS partner
    const completedCount = await Booking.countDocuments({
      partnerId,
      clientId: seekerId,
      stage: 'COMPLETED',
    });
    if (completedCount < 1) return false;

    // 3. Must have NO active or historical disputes between this pair
    const disputesCount = await Dispute.countDocuments({
      $or: [
        { initiatorId: seekerId, respondentId: partnerId },
        { initiatorId: partnerId, respondentId: seekerId },
      ],
    });
    if (disputesCount > 0) return false;

    return true;
  }
}

export const autoRulesService = new AutoRulesService();
