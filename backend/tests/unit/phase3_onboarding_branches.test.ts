import { describe, it, expect } from 'vitest';
import { resolveNextRoute, Role } from '@date-to-go/access-policy';

describe('Phase 3: Branch Onboarding & KYC Transitions', () => {
  it('correctly transitions seeker from IN_PROGRESS to LIVE', () => {
    const before = resolveNextRoute({
      onboardingState: 'IN_PROGRESS',
      activeRole: Role.SEEKER,
      roles: [Role.SEEKER],
    });
    expect(before).toBe('/onboarding/seeker');

    const after = resolveNextRoute({
      onboardingState: 'LIVE',
      activeRole: Role.SEEKER,
      roles: [Role.SEEKER],
    });
    expect(after).toBe('/s/home');
  });

  it('correctly transitions partner from IN_PROGRESS to SUBMITTED and then LIVE', () => {
    const inProgress = resolveNextRoute({
      onboardingState: 'IN_PROGRESS',
      activeRole: Role.PARTNER,
      roles: [Role.PARTNER],
    });
    expect(inProgress).toBe('/onboarding/partner');

    const submitted = resolveNextRoute({
      onboardingState: 'SUBMITTED',
      activeRole: Role.PARTNER,
      roles: [Role.PARTNER],
    });
    expect(submitted).toBe('/p/status');

    const live = resolveNextRoute({
      onboardingState: 'LIVE',
      activeRole: Role.PARTNER,
      roles: [Role.PARTNER],
    });
    expect(live).toBe('/p/dashboard');
  });
});
