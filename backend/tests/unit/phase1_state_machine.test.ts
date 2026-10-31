import { describe, it, expect } from 'vitest';
import { resolveNextRoute, Role } from '@date-to-go/access-policy';
import { Profile } from '../../src/models/Profile.js';
import { ProfileDraft } from '../../src/models/ProfileDraft.js';
import { User } from '../../src/models/User.js';
import mongoose from 'mongoose';

describe('Phase 1: State Machine & Models', () => {
  describe('Onboarding State Machine: resolveNextRoute', () => {
    it('returns /onboarding/phone for NEW users', () => {
      const route = resolveNextRoute({ onboardingState: 'NEW' });
      expect(route).toBe('/onboarding/phone');
    });

    it('returns /onboarding/consent for PHONE_VERIFIED users', () => {
      const route = resolveNextRoute({ onboardingState: 'PHONE_VERIFIED' });
      expect(route).toBe('/onboarding/consent');
    });

    it('returns /onboarding/fork for FORK stage', () => {
      const route = resolveNextRoute({ onboardingState: 'FORK' });
      expect(route).toBe('/onboarding/fork');
    });

    it('returns /onboarding/seeker for IN_PROGRESS Seeker', () => {
      const route = resolveNextRoute({
        onboardingState: 'IN_PROGRESS',
        activeRole: Role.SEEKER,
        roles: [Role.SEEKER],
      });
      expect(route).toBe('/onboarding/seeker');
    });

    it('returns /onboarding/partner for IN_PROGRESS Partner', () => {
      const route = resolveNextRoute({
        onboardingState: 'IN_PROGRESS',
        activeRole: Role.PARTNER,
        roles: [Role.PARTNER],
      });
      expect(route).toBe('/onboarding/partner');
    });

    it('returns /p/status for SUBMITTED Partner', () => {
      const route = resolveNextRoute({
        onboardingState: 'SUBMITTED',
        activeRole: Role.PARTNER,
        roles: [Role.PARTNER],
      });
      expect(route).toBe('/p/status');
    });

    it('returns /s/home for LIVE Seeker', () => {
      const route = resolveNextRoute({
        onboardingState: 'LIVE',
        activeRole: Role.SEEKER,
        roles: [Role.SEEKER],
      });
      expect(route).toBe('/s/home');
    });

    it('returns /p/dashboard for LIVE Partner', () => {
      const route = resolveNextRoute({
        onboardingState: 'LIVE',
        activeRole: Role.PARTNER,
        roles: [Role.PARTNER],
      });
      expect(route).toBe('/p/dashboard');
    });
  });

  describe('Model Instantiation & Schema Validation', () => {
    it('validates ProfileDraft model schema structure', () => {
      const dummyId = new mongoose.Types.ObjectId();
      const draft = new ProfileDraft({
        userId: dummyId,
        role: 'SEEKER',
        step: 'SEEKER_BASICS',
        data: { name: 'Test Seeker', city: 'Mumbai' },
        isCompleted: false,
      });

      expect(draft.userId).toEqual(dummyId);
      expect(draft.role).toBe('SEEKER');
      expect(draft.step).toBe('SEEKER_BASICS');
      expect(draft.data.name).toBe('Test Seeker');
      expect(draft.version).toBe(1);
    });

    it('validates published Profile model schema structure', () => {
      const dummyId = new mongoose.Types.ObjectId();
      const profile = new Profile({
        userId: dummyId,
        role: 'PARTNER',
        displayName: 'Priya Companion',
        gender: 'FEMALE',
        dob: new Date('1998-05-15'),
        city: 'Bengaluru',
        bio: 'Warm and friendly platonic companion for city tours and dining.',
        interests: ['Art', 'Coffee'],
        rates: [],
      });

      expect(profile.displayName).toBe('Priya Companion');
      expect(profile.role).toBe('PARTNER');
      expect(profile.city).toBe('Bengaluru');
      expect(profile.ratingAvg).toBe(5.0);
    });

    it('validates User model onboarding defaults', () => {
      const user = new User({
        phone: '+919876543210',
      });

      expect(user.onboardingState).toBe('NEW');
      expect(user.currentStep).toBe('PHONE');
      expect(user.roleForkLocked).toBe(false);
      expect(user.status).toBe('ACTIVE');
    });
  });
});
