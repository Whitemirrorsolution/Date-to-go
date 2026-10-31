import { PartnerProfile } from '../models/PartnerProfile.js';
import { User } from '../models/User.js';
import { AppError } from '../utils/AppError.js';

export interface HealthItem {
  key: string;
  label: string;
  weight: number;
  done: boolean;
  mandatory: boolean;
}

export interface HealthScore {
  score: number;
  band: 'RED' | 'ORANGE' | 'YELLOW' | 'GREEN';
  items: HealthItem[];
  nextActions: string[];
}

export interface GatingResult {
  allowed: boolean;
  missing: string[];
}

export class PartnerProfileHealthService {

  async calculateHealth(userId: string): Promise<HealthScore> {
    const profile = await PartnerProfile.findOne({ userId });
    const user = await User.findById(userId);

    if (!profile || !user) {
      throw new AppError('Profile not found', 404, 'NOT_FOUND');
    }

    const items: HealthItem[] = [
      { key: 'primaryPhoto', label: 'Primary Photo', weight: 15, done: !!profile.primaryPhoto, mandatory: true },
      { key: 'gallery', label: 'Photo Gallery (Min 3)', weight: 15, done: profile.photos && profile.photos.length >= 3, mandatory: true },
      { key: 'basics', label: 'Basic Details', weight: 15, done: !!(profile.displayName && profile.gender && profile.dob), mandatory: true },
      { key: 'location', label: 'Location Details', weight: 15, done: !!(profile.city && profile.pincode), mandatory: true },
      { key: 'bio', label: 'About You (Bio)', weight: 10, done: !!profile.bio && profile.bio.length >= 80, mandatory: true },
      { key: 'categories', label: 'Services & Rates', weight: 10, done: profile.categories && profile.categories.length >= 1, mandatory: true },
      { key: 'kycSubmitted', label: 'KYC Submitted', weight: 10, done: ['PENDING', 'VERIFIED'].includes(user.kycStatus), mandatory: true },
      { key: 'kycApproved', label: 'KYC Approved', weight: 10, done: user.kycStatus === 'VERIFIED', mandatory: true },
    ];

    let score = 0;
    const nextActions: string[] = [];

    for (const item of items) {
      if (item.done) {
        score += item.weight;
      } else {
        nextActions.push(`Add ${item.label}`);
      }
    }

    let band: 'RED' | 'ORANGE' | 'YELLOW' | 'GREEN' = 'RED';
    if (score >= 90) band = 'GREEN';
    else if (score >= 70) band = 'YELLOW';
    else if (score >= 40) band = 'ORANGE';

    return { score, band, items, nextActions };
  }

  async canCreateListings(userId: string): Promise<GatingResult> {
    const health = await this.calculateHealth(userId);
    const user = await User.findById(userId);

    const missing: string[] = [];

    // Mandatory health items
    for (const item of health.items) {
      if (item.mandatory && !item.done) {
        missing.push(item.label);
      }
    }

    // Specific rules
    if (user?.kycStatus !== 'VERIFIED') {
      if (!missing.includes('KYC Approved')) missing.push('KYC Approved');
    }

    // Temporarily disabled Admin Approval requirement for local testing
    // if (profile?.approvalStatus !== 'APPROVED') {
    //   missing.push('Profile Content Approved by Admin');
    // }

    // Check subscription active (simplified check)
    // Note: Assuming a subscription check is handled via Auth middleware, but if strict:
    // ...

    return {
      allowed: missing.length === 0,
      missing,
    };
  }
}

export const partnerProfileHealthService = new PartnerProfileHealthService();
