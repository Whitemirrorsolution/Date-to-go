import { describe, it, expect } from 'vitest';
import {
  resolveNextRoute,
  resolveHomeRoute,
  Role,
  PartnerState,
  SeekerState,
  UserAccessData,
} from '@date-to-go/access-policy';

describe('Route Resolution Policy', () => {
  const baseEntitlement = { active: false, endsAt: null, planId: null };
  const activeEntitlement = {
    active: true,
    endsAt: new Date(Date.now() + 86400000),
    planId: 'plan_123',
  };

  const createAccess = (overrides: Partial<UserAccessData>): UserAccessData => ({
    roles: [Role.SEEKER],
    activeRole: Role.SEEKER,
    onboardingState: 'LIVE',
    currentStep: 'COMPLETED',
    accessVersion: 1,
    accountStatus: SeekerState.ACTIVE,
    entitlements: {
      seeker: { ...baseEntitlement },
      partner: { ...baseEntitlement },
    },
    partner: {
      onboardingState: PartnerState.NO_PARTNER_PLAN,
      canCreateListings: false,
      missing: [],
    },
    ...overrides,
  });

  describe('resolveNextRoute (State Machine)', () => {
    it('redirects to /onboarding/phone for NEW users', () => {
      expect(resolveNextRoute({ onboardingState: 'NEW' })).toBe('/onboarding/phone');
    });

    it('redirects to /onboarding/seeker for IN_PROGRESS seeker', () => {
      expect(
        resolveNextRoute({
          onboardingState: 'IN_PROGRESS',
          activeRole: Role.SEEKER,
          roles: [Role.SEEKER],
        }),
      ).toBe('/onboarding/seeker');
    });

    it('redirects to /onboarding/partner for IN_PROGRESS partner', () => {
      expect(
        resolveNextRoute({
          onboardingState: 'IN_PROGRESS',
          activeRole: Role.PARTNER,
          roles: [Role.PARTNER],
        }),
      ).toBe('/onboarding/partner');
    });

    it('redirects to /p/status for SUBMITTED partner', () => {
      expect(
        resolveNextRoute({
          onboardingState: 'SUBMITTED',
          activeRole: Role.PARTNER,
          roles: [Role.PARTNER],
        }),
      ).toBe('/p/status');
    });
  });

  describe('resolveHomeRoute', () => {
    it('redirects to resolveNextRoute if onboarding is not LIVE', () => {
      const access = createAccess({
        onboardingState: 'IN_PROGRESS',
        activeRole: Role.SEEKER,
      });
      expect(resolveHomeRoute(access)).toBe('/onboarding/seeker');
    });

    it('returns /s/home for LIVE seeker with active plan', () => {
      const access = createAccess({
        onboardingState: 'LIVE',
        activeRole: Role.SEEKER,
        entitlements: { seeker: activeEntitlement, partner: baseEntitlement },
      });
      expect(resolveHomeRoute(access)).toBe('/s/home');
    });

    it('returns /pricing for LIVE seeker without active plan', () => {
      const access = createAccess({
        onboardingState: 'LIVE',
        activeRole: Role.SEEKER,
        entitlements: { seeker: baseEntitlement, partner: baseEntitlement },
      });
      expect(resolveHomeRoute(access)).toBe('/pricing');
    });

    it('returns /p/dashboard for LIVE partner with active entitlement', () => {
      const access = createAccess({
        onboardingState: 'LIVE',
        roles: [Role.PARTNER],
        activeRole: Role.PARTNER,
        entitlements: { seeker: baseEntitlement, partner: activeEntitlement },
        partner: {
          onboardingState: PartnerState.LIVE,
          canCreateListings: true,
          missing: [],
        },
      });
      expect(resolveHomeRoute(access)).toBe('/p/dashboard');
    });
  });
});
