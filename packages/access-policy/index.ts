export enum Role {
  SEEKER = 'SEEKER',
  PARTNER = 'PARTNER',
  ADMIN = 'ADMIN',
  MODERATOR = 'MODERATOR',
  KYC_REVIEWER = 'KYC_REVIEWER',
  FINANCE = 'FINANCE'
}

export type RoleName =
  | 'SEEKER'
  | 'PARTNER'
  | 'ADMIN'
  | 'MODERATOR'
  | 'KYC_REVIEWER'
  | 'FINANCE';

export enum EntitlementAudience {
  SEEKER = 'SEEKER',
  PARTNER = 'PARTNER',
  BOTH = 'BOTH'
}

export type OnboardingState =
  | 'NEW'
  | 'PHONE_VERIFIED'
  | 'FORK'
  | 'IN_PROGRESS'
  | 'SUBMITTED'
  | 'LIVE';

export enum PartnerState {
  NO_PARTNER_PLAN = 'NO_PARTNER_PLAN',
  PROFILE_INCOMPLETE = 'PROFILE_INCOMPLETE',
  KYC_REQUIRED = 'KYC_REQUIRED',
  IN_REVIEW = 'IN_REVIEW',
  NEEDS_CHANGES = 'NEEDS_CHANGES',
  LIVE = 'LIVE',
  PAUSED = 'PAUSED',
  SUSPENDED = 'SUSPENDED'
}

export enum SeekerState {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED'
}

export interface Entitlement {
  active: boolean;
  endsAt: Date | null;
  planId: string | null;
}

export interface UserAccessData {
  roles: Role[];
  activeRole: Role | null;
  role?: string;
  onboardingState: OnboardingState;
  currentStep: string;
  roleForkLocked?: boolean;
  nextRoute?: string;
  entitlements: {
    seeker: Entitlement;
    partner: Entitlement;
  };
  partner: {
    onboardingState: PartnerState;
    healthScore?: number;
    kycStatus?: string;
    approvalStatus?: string;
    canCreateListings: boolean;
    missing: string[];
  };
  accountStatus: SeekerState;
  accessVersion: number;
}

// Route Policy Table
export const PUBLIC_ROUTES = [
  '/', '/login', '/register', '/verify-otp', '/forgot-password',
  '/reset-password', '/privacy', '/terms', '/code-of-conduct', '/about', '/help', '/pricing',
  '/partner/*', '/s/partner/*', '/onboarding', '/onboarding/*'
];

export const SHARED_AUTHENTICATED_ROUTES = [
  '/become-partner', '/notifications', '/support', '/partner/*', '/s/partner/*',
  '/onboarding', '/onboarding/*'
];

const ADMIN_ROUTE_ROLES: Array<{ route: string; roles: Role[] }> = [
  { route: '/admin/kyc', roles: [Role.ADMIN, Role.KYC_REVIEWER] },
  { route: '/admin/categories', roles: [Role.ADMIN, Role.MODERATOR, Role.FINANCE] },
  { route: '/admin/plans', roles: [Role.ADMIN, Role.MODERATOR] },
];

// Helper to determine if a path matches a route pattern (e.g. /s/*)
export function matchRoute(path: string, routes: string[]): boolean {
  for (const route of routes) {
    if (route.endsWith('/*')) {
      const prefix = route.slice(0, -2);
      if (path.startsWith(prefix)) return true;
    } else {
      if (path === route) return true;
    }
  }
  return false;
}

export function resolveNextRoute(access: {
  onboardingState?: OnboardingState;
  currentStep?: string;
  activeRole?: Role | string | null;
  roles?: (Role | string)[];
  partner?: { onboardingState?: PartnerState };
  entitlements?: { seeker?: Entitlement; partner?: Entitlement };
}): string {
  const state = access.onboardingState || 'NEW';

  switch (state) {
    case 'NEW':
      return '/onboarding/phone';
    case 'PHONE_VERIFIED':
      return '/onboarding/consent';
    case 'FORK':
      return '/onboarding/fork';
    case 'IN_PROGRESS':
      if (access.activeRole === Role.PARTNER || access.roles?.includes(Role.PARTNER) || access.roles?.includes('PARTNER')) {
        return '/onboarding/partner';
      }
      return '/onboarding/seeker';
    case 'SUBMITTED':
    case 'LIVE':
    default:
      if (access.activeRole === Role.PARTNER || access.roles?.includes(Role.PARTNER) || access.roles?.includes('PARTNER')) {
        const isAdmin = access.roles?.includes(Role.ADMIN) || access.roles?.includes('ADMIN');
        if (!isAdmin && !access.entitlements?.partner?.active) {
          return '/pricing';
        }
        return '/p/dashboard';
      }
      return '/s/home';
  }
}

export function resolveHomeRoute(access: UserAccessData): string {
  // If user has not completed onboarding, route them directly via resolveNextRoute
  if (access.onboardingState && access.onboardingState !== 'LIVE') {
    return resolveNextRoute(access);
  }

  if (access.activeRole === Role.SEEKER) {
    if (!access.entitlements.seeker.active && !access.roles.includes(Role.ADMIN)) {
      return '/pricing';
    }
    return '/s/home';
  }

  if (access.activeRole === Role.PARTNER) {
    if (!access.roles.includes(Role.ADMIN) && !access.entitlements.partner.active) {
      return '/pricing';
    }

    switch (access.partner.onboardingState) {
      case PartnerState.NO_PARTNER_PLAN:
        return '/pricing';
      case PartnerState.PAUSED:
        return '/p/renew';
      case PartnerState.SUSPENDED:
        return '/p/suspended';
      default:
        return '/p/dashboard';
    }
  }

  return '/onboarding/phone';
}

export function canAccessRoute(path: string, access: UserAccessData | null): boolean {
  if (path.startsWith('/partner/') || path.startsWith('/s/partner/')) return true;
  if (matchRoute(path, PUBLIC_ROUTES)) return true;
  if (!access || !access.activeRole) return false;

  if (matchRoute(path, SHARED_AUTHENTICATED_ROUTES)) return true;

  // Onboarding route protection
  if (path.startsWith('/onboarding') || path.startsWith('/onboarding/')) {
    return true;
  }

  // Allow partner status, kyc, and onboarding screens for partners (even before LIVE or subscription)
  if (path === '/p/status' || path === '/p/kyc' || path === '/p/onboarding') {
    const isPartner =
      access.activeRole === Role.PARTNER ||
      access.roles?.includes(Role.PARTNER) ||
      (access.roles as string[])?.includes('PARTNER') ||
      access.role === 'PARTNER';
    if (isPartner) return true;
  }

  if (path === '/admin' || path.startsWith('/admin/')) {
    if (path === '/admin' && access.roles.some((role) =>
      [Role.ADMIN, Role.MODERATOR, Role.KYC_REVIEWER, Role.FINANCE].includes(role),
    )) return true;

    const scopedRoute = ADMIN_ROUTE_ROLES.find(({ route }) =>
      path === route || path.startsWith(`${route}/`),
    );
    if (scopedRoute) {
      return scopedRoute.roles.some((role) => access.roles.includes(role));
    }
    return access.roles.includes(Role.ADMIN);
  }

  // Prevent users with incomplete onboarding from accessing dashboard routes
  // (Partners who have SUBMITTED their onboarding are allowed to access the partner dashboard)
  const isPartner =
    access.activeRole === Role.PARTNER ||
    access.roles?.includes(Role.PARTNER) ||
    (access.roles as string[])?.includes('PARTNER') ||
    access.role === 'PARTNER';

  if (access.onboardingState && access.onboardingState !== 'LIVE') {
    if (!(isPartner && access.onboardingState === 'SUBMITTED')) {
      return false;
    }
  }

  if (path.startsWith('/s/')) {
    if (access.activeRole !== Role.SEEKER) return false;
    if (path === '/pricing') return true;
    if (access.roles.includes(Role.ADMIN)) return true;
    return access.entitlements.seeker.active && access.accountStatus === SeekerState.ACTIVE;
  }

  if (path.startsWith('/p/')) {
    if (!isPartner) return false;
    if (path === '/pricing' || path === '/p/renew') return true;
    if (path === '/p/suspended') return access.partner.onboardingState === PartnerState.SUSPENDED;

    if (access.roles.includes(Role.ADMIN)) return true;

    // Subscription is strictly mandatory for Partner Dashboard & panel activities!
    if (!access.entitlements.partner.active) {
      if (path === '/p/onboarding' || path === '/p/status' || path === '/p/kyc') {
        return true;
      }
      return false;
    }

    return true;
  }

  return false;
}
