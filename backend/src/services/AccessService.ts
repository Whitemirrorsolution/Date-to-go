import { EventEmitter } from 'events';
import { User } from '../models/User.js';
import { Subscription } from '../models/Subscription.js';
import { PartnerProfile } from '../models/PartnerProfile.js';
import { AppError } from '../utils/AppError.js';
import { logger } from '../utils/logger.js';
import { UserAccessData, Role, PartnerState, OnboardingState, resolveNextRoute } from '@date-to-go/access-policy';

export const accessEventEmitter = new EventEmitter();
accessEventEmitter.setMaxListeners(1000); // For many SSE connections

export class AccessService {
  /**
   * Generates a complete snapshot of a user's access rights.
   */
  async loadAccessSnapshot(userId: string): Promise<UserAccessData> {
    const user = await User.findById(userId).select(
      '+status +roles +activeMode +accessVersion +kycStatus +onboardingState +currentStep +roleForkLocked',
    );
    if (!user) throw new AppError('User not found', 404, 'NOT_FOUND');

    const subs = await Subscription.find({
      userId,
      status: 'ACTIVE',
      $or: [{ endsAt: { $gt: new Date() } }, { endsAt: null }]
    }).populate('planId');

    let seekerActive = false;
    let seekerEndsAt: Date | null = null;
    let seekerPlanId: string | null = null;

    let partnerActive = false;
    let partnerEndsAt: Date | null = null;
    let partnerPlanId: string | null = null;

    for (const sub of subs) {
      const plan = sub.planId as any;
      if (!plan) continue;

      if (plan.audience === 'SEEKER' || plan.audience === 'BOTH') {
        seekerActive = true;
        if (sub.endsAt && (!seekerEndsAt || sub.endsAt > seekerEndsAt)) {
          seekerEndsAt = sub.endsAt;
        }
        seekerPlanId = plan._id.toString();
      }
      if (plan.audience === 'PARTNER' || plan.audience === 'BOTH') {
        partnerActive = true;
        if (sub.endsAt && (!partnerEndsAt || sub.endsAt > partnerEndsAt)) {
          partnerEndsAt = sub.endsAt;
        }
        partnerPlanId = plan._id.toString();
      }
    }

    let partnerState = PartnerState.NO_PARTNER_PLAN;
    let partnerCanCreateListings = false;
    let partnerMissing: string[] = [];
    let partnerApprovalStatus: string | undefined;


    

    if (user.roles.includes(Role.PARTNER)) {
      const partnerProfile = await PartnerProfile.findOne({ userId });
    console.log("Partner profile ", partnerProfile)
      if (!partnerProfile) {
        partnerState = PartnerState.PROFILE_INCOMPLETE;
      } else {
        partnerApprovalStatus = partnerProfile.approvalStatus;
        // Dashboard accessible when partnerActive; listing creation based on KYC approval
        partnerState = partnerActive ? PartnerState.LIVE : PartnerState.NO_PARTNER_PLAN;
        partnerCanCreateListings = partnerProfile.isListed && partnerActive;
      }
    }

    if (user.status === 'SUSPENDED') {
      partnerState = PartnerState.SUSPENDED;
    }

    // Determine onboarding state with backwards-compatible fallback for active users
    let onboardingState: OnboardingState = user.onboardingState || 'NEW';
    if (!user.onboardingState && user.status === 'ACTIVE') {
      onboardingState = 'LIVE';
    }
    // If partner has submitted onboarding/KYC, allow them full dashboard access (LIVE state)
    if (user.roles.includes(Role.PARTNER) && onboardingState === 'SUBMITTED') {
      onboardingState = 'LIVE';
    }

    const currentStep = user.currentStep || 'PHONE';
    const roleForkLocked = Boolean(user.roleForkLocked);

    const snapshotPayload = {
      roles: user.roles as Role[],
      activeRole: user.activeMode as Role,
      role: user.activeMode,
      onboardingState,
      currentStep,
      roleForkLocked,
      entitlements: {
        seeker: { active: seekerActive, endsAt: seekerEndsAt, planId: seekerPlanId },
        partner: { active: partnerActive, endsAt: partnerEndsAt, planId: partnerPlanId }
      },
      partner: {
        onboardingState: partnerState,
        kycStatus: user.kycStatus,
        ...(partnerApprovalStatus !== undefined ? { approvalStatus: partnerApprovalStatus } : {}),
        canCreateListings: partnerCanCreateListings,
        missing: partnerMissing
      },
      accountStatus: user.status as any,
      accessVersion: user.accessVersion
    };

    const nextRoute = resolveNextRoute(snapshotPayload);

    return {
      ...snapshotPayload,
      nextRoute
    };
  }

  /**
   * Bumps the accessVersion for a user and emits the access.changed event.
   */
  async publishAccessChange(userId: string, reason: string): Promise<void> {
    const user = await User.findByIdAndUpdate(
      userId,
      { $inc: { accessVersion: 1 } },
      { new: true }
    );
    if (!user) return;

    logger.info({ userId, reason, newVersion: user.accessVersion }, 'Access version incremented');

    accessEventEmitter.emit(`access.changed:${userId}`, {
      type: 'access.changed',
      userId,
      reason,
      accessVersion: user.accessVersion,
      timestamp: new Date().toISOString()
    });
  }
}

export const accessService = new AccessService();
