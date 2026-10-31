/**
 * Auth routes — /api/v1/auth
 *
 * Public:  POST register, login, forgot-password, reset-password, refresh
 * Auth:    GET  me, POST logout, logout-all, verify-email, resend-email-otp,
 *               send-phone-otp, verify-phone-otp, change-password,
 *          GET  export-data, DELETE account
 */
import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler.js';
import { authService } from '../services/AuthService.js';
import { requireAuth } from '../middlewares/auth.js';
import { authRateLimiter } from '../middlewares/security.js';
import { AppError } from '../utils/AppError.js';
import { User } from '../models/User.js';

const router: Router = Router();

// ── Validation schemas ─────────────────────────────────────────────────────

const RegisterSchema = z.object({
  intent: z.enum(['Find a partner', 'Become a partner']),
  fullName: z.string().min(2).max(100),
  email: z.string().email().max(254),
  password: z.string().min(10).max(128),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']),
  dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'dob must be YYYY-MM-DD'),
  city: z.string().min(1).max(100),
  acceptedTerms: z.literal(true, { errorMap: () => ({ message: 'You must accept the Terms of Service' }) }),
  acceptedPrivacy: z.literal(true, { errorMap: () => ({ message: 'You must accept the Privacy Policy' }) }),
  acceptedCommunity: z.literal(true, { errorMap: () => ({ message: 'You must accept the Community Guidelines' }) }),
  phone: z.string().regex(/^\+?[1-9]\d{6,14}$/),
  otp: z.string().length(6),
});

const LoginSchema = z.object({
  identifier: z.string().min(1),
  password: z.string().min(1),
});

const VerifyEmailSchema = z.object({ otp: z.string().length(6) });
const PhoneSchema = z.object({ phone: z.string().regex(/^\+?[1-9]\d{6,14}$/) });
const VerifyPhoneSchema = z.object({
  phone: z.string().regex(/^\+?[1-9]\d{6,14}$/),
  otp: z.string().length(6),
});
const ForgotPasswordSchema = z.object({ email: z.string().email() });
const ResetPasswordSchema = z.object({
  email: z.string().email(),
  otp: z.string().length(6),
  newPassword: z.string().min(10).max(128),
});
const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(10).max(128),
});
const DeleteAccountSchema = z.object({ password: z.string().min(1) });

// ── POST /register ─────────────────────────────────────────────────────────

router.post(
  '/register',
  authRateLimiter,
  asyncHandler(async (req, res) => {
    const dto = RegisterSchema.parse(req.body);
    const result = await authService.register(dto, req, res);
    // Access token in body; refresh token set as httpOnly cookie by authService
    res.status(201).json({
      success: true,
      message: 'Registration successful. Account activated.',
      data: { userId: result.userId, accessToken: result.accessToken },
    });
  }),
);

// ── POST /register/otp/request ─────────────────────────────────────────────

router.post(
  '/register/otp/request',
  authRateLimiter,
  asyncHandler(async (req, res) => {
    // We parse the RegisterSchema except we don't require the OTP yet
    const preSchema = RegisterSchema.omit({ otp: true });
    const dto = preSchema.parse(req.body);

    await authService.requestRegisterOtp(dto);
    res.status(200).json({ success: true, message: 'OTP sent successfully' });
  }),
);

// ── POST /login ────────────────────────────────────────────────────────────

router.post(
  '/login',
  authRateLimiter,
  asyncHandler(async (req, res) => {
    const dto = LoginSchema.parse(req.body);
    const result = await authService.login(dto, req, res);
    res.status(200).json({ success: true, data: result });
  }),
);

const handleLoginOtpRequest = asyncHandler(async (req, res) => {
  const rawPhone = (req.body?.phone || req.query?.phone) as string | undefined;
  if (!rawPhone) {
    throw new AppError(
      'Phone number is required. Please provide "phone" in JSON body (POST) or as a query parameter (GET).',
      400,
      'PHONE_REQUIRED',
    );
  }
  const { phone } = PhoneSchema.parse({ phone: rawPhone });
  await authService.requestLoginOtp(phone);
  res.status(200).json({ success: true, message: 'OTP sent via WhatsApp / SMS' });
});

router.post('/login/otp/request', authRateLimiter, handleLoginOtpRequest);
router.get('/login/otp/request', authRateLimiter, handleLoginOtpRequest);

const handleTrunkOtpRequest = asyncHandler(async (req, res) => {
  const rawPhone = (req.body?.phone || req.query?.phone) as string | undefined;
  if (!rawPhone) {
    throw new AppError(
      'Phone number is required. Please provide "phone" in JSON body (POST) or as a query parameter (GET).',
      400,
      'PHONE_REQUIRED',
    );
  }
  const { phone } = PhoneSchema.parse({ phone: rawPhone });
  await authService.requestTrunkOtp(phone);
  res.status(200).json({ success: true, message: 'OTP sent via WhatsApp / SMS' });
});

router.post('/trunk/otp/request', authRateLimiter, handleTrunkOtpRequest);
router.get('/trunk/otp/request', authRateLimiter, handleTrunkOtpRequest);

const handleOtpVerify = asyncHandler(async (req, res) => {
  const phone = (req.body?.phone || req.query?.phone) as string | undefined;
  const otp = (req.body?.otp || req.query?.otp) as string | undefined;
  if (!phone || !otp) {
    throw new AppError('Phone number and 6-digit OTP code are required', 400, 'VALIDATION_ERROR');
  }
  const result = await authService.verifyLoginOtp(phone, otp, req, res);
  res.status(200).json({ success: true, data: result });
});

router.post(['/login/otp/verify', '/trunk/otp/verify'], authRateLimiter, handleOtpVerify);
router.get(['/login/otp/verify', '/trunk/otp/verify'], authRateLimiter, handleOtpVerify);

// ── POST /refresh ─────────────────────────────────────────────────────────

router.post(
  '/refresh',
  asyncHandler(async (req, res) => {
    const rawToken = req.cookies['dtg_refresh'] as string | undefined;
    if (!rawToken) {
      throw new AppError('No refresh token', 401, 'MISSING_REFRESH_TOKEN');
    }
    const result = await authService.refresh(rawToken, res);
    res.status(200).json({ success: true, data: result });
  }),
);

// ── POST /logout ──────────────────────────────────────────────────────────

router.post(
  '/logout',
  requireAuth,
  asyncHandler(async (req, res) => {
    const rawToken = req.cookies['dtg_refresh'] as string | undefined;
    await authService.logout(rawToken, req.user!.id, res);
    res.status(200).json({ success: true, message: 'Logged out' });
  }),
);

// ── POST /logout-all ──────────────────────────────────────────────────────

router.post(
  '/logout-all',
  requireAuth,
  asyncHandler(async (req, res) => {
    await authService.logoutAll(req.user!.id, res);
    res.status(200).json({ success: true, message: 'Logged out from all sessions' });
  }),
);

// ── GET /me ───────────────────────────────────────────────────────────────

router.get(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.user!.id).select(
      '-passwordHash -tokenVersion -failedLoginAttempts -lockUntil',
    );
    if (!user) throw new AppError('User not found', 404, 'NOT_FOUND');

    res.status(200).json({ success: true, data: { user } });
  }),
);

// ── GET /me/access ────────────────────────────────────────────────────────

router.get(
  '/me/access',
  requireAuth,
  asyncHandler(async (req, res) => {
    const userId = req.user!.id;

    const { accessService } = await import('../services/AccessService.js');
    const { resolveNextRoute } = await import('@date-to-go/access-policy');

    const accessData = await accessService.loadAccessSnapshot(userId);
    const nextRoute = accessData.nextRoute || resolveNextRoute(accessData);

    res.status(200).json({
      success: true,
      data: {
        ...accessData,
        role: accessData.activeRole || accessData.role,
        currentStep: accessData.currentStep,
        nextRoute,
        onboardingState: accessData.onboardingState,
      },
    });
  }),
);

// ── POST /fork-role & /onboarding/fork ────────────────────────────────────

router.post(
  ['/fork-role', '/onboarding/fork'],
  requireAuth,
  asyncHandler(async (req, res) => {
    const { role } = z.object({ role: z.enum(['SEEKER', 'PARTNER']) }).parse(req.body);
    const user = await User.findById(req.user!.id);
    if (!user) throw new AppError('User not found', 404, 'NOT_FOUND');

    if (user.roleForkLocked && user.activeMode !== role) {
      throw new AppError('Role fork has already been locked for this account', 403, 'ROLE_FORK_LOCKED');
    }

    user.roles = [role];
    user.activeMode = role;
    user.roleForkLocked = true;
    user.onboardingState = 'IN_PROGRESS';
    user.currentStep = role === 'PARTNER' ? 'PARTNER_BASICS' : 'SEEKER_BASICS';
    await user.save();

    // Upsert ProfileDraft
    const { ProfileDraft } = await import('../models/ProfileDraft.js');
    await ProfileDraft.findOneAndUpdate(
      { userId: user._id },
      { role, step: user.currentStep, $setOnInsert: { data: {}, isCompleted: false, version: 1 } },
      { upsert: true, new: true },
    );

    const { accessService } = await import('../services/AccessService.js');
    const { resolveNextRoute } = await import('@date-to-go/access-policy');
    await accessService.publishAccessChange(req.user!.id, 'role.forked');

    const nextRoute = resolveNextRoute({
      onboardingState: user.onboardingState,
      currentStep: user.currentStep,
      activeRole: user.activeMode,
      roles: user.roles,
    });

    res.status(200).json({
      success: true,
      message: `Role locked to ${role}`,
      data: {
        role: user.activeMode,
        currentStep: user.currentStep,
        nextRoute,
        onboardingState: user.onboardingState,
        roleForkLocked: true,
      },
    });
  }),
);

// ── POST /onboarding/consent ──────────────────────────────────────────────

router.post(
  '/onboarding/consent',
  requireAuth,
  asyncHandler(async (req, res) => {
    const ConsentSchema = z.object({
      dob: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'dob must be YYYY-MM-DD'),
      acceptedTerms: z.literal(true),
      acceptedPrivacy: z.literal(true),
      acceptedCommunity: z.literal(true),
    });
    const dto = ConsentSchema.parse(req.body);

    const dob = new Date(dto.dob);
    if (isNaN(dob.getTime())) throw new AppError('Invalid date of birth', 400, 'INVALID_DOB');

    const now = new Date();
    const age =
      now.getFullYear() -
      dob.getFullYear() -
      (now < new Date(now.getFullYear(), dob.getMonth(), dob.getDate()) ? 1 : 0);
    if (age < 18) {
      throw new AppError('You must be at least 18 years of age to use Date to Go', 403, 'UNDERAGE');
    }

    const user = await User.findById(req.user!.id);
    if (!user) throw new AppError('User not found', 404, 'NOT_FOUND');

    user.dob = dob;
    user.dobVerified = true;
    user.consentAccepted = true;
    if (user.onboardingState === 'NEW' || user.onboardingState === 'PHONE_VERIFIED') {
      user.onboardingState = 'FORK';
      user.currentStep = 'FORK';
    }
    await user.save();

    const { accessService } = await import('../services/AccessService.js');
    const { resolveNextRoute } = await import('@date-to-go/access-policy');
    await accessService.publishAccessChange(req.user!.id, 'consent.accepted');

    const nextRoute = resolveNextRoute({
      onboardingState: user.onboardingState,
      currentStep: user.currentStep,
      activeRole: user.activeMode,
      roles: user.roles,
    });

    res.status(200).json({
      success: true,
      message: 'Age and consent recorded',
      data: {
        role: user.activeMode,
        currentStep: user.currentStep,
        nextRoute,
        onboardingState: user.onboardingState,
      },
    });
  }),
);

// ── GET & PATCH /onboarding/draft ─────────────────────────────────────────

router.get(
  '/onboarding/draft',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { ProfileDraft } = await import('../models/ProfileDraft.js');
    let draft = await ProfileDraft.findOne({ userId: req.user!.id });
    if (!draft) {
      draft = await ProfileDraft.create({
        userId: req.user!.id,
        role: (req.user!.activeMode as any) || 'SEEKER',
        step: req.user!.activeMode === 'PARTNER' ? 'PARTNER_BASICS' : 'SEEKER_BASICS',
        data: {},
      });
    }
    res.status(200).json({ success: true, data: draft });
  }),
);

router.patch(
  '/onboarding/draft',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { ProfileDraft } = await import('../models/ProfileDraft.js');
    const { step, data, isCompleted, kycDocuments } = req.body;

    let draft = await ProfileDraft.findOne({ userId: req.user!.id });
    if (!draft) {
      draft = new ProfileDraft({
        userId: req.user!.id,
        role: (req.user!.activeMode as any) || 'SEEKER',
        step: step || 'BASICS',
        data: {},
        kycDocuments: [],
      });
    }

    if (step) {
      draft.step = step;
      await User.findByIdAndUpdate(req.user!.id, { currentStep: step });
    }
    if (data) {
      draft.data = { ...(draft.data || {}), ...data };
      draft.markModified('data');
    }
    if (kycDocuments) {
      draft.kycDocuments = kycDocuments;
      draft.markModified('kycDocuments');
    }
    if (isCompleted !== undefined) {
      draft.isCompleted = isCompleted;
    }
    draft.version = (draft.version || 0) + 1;
    await draft.save();

    res.status(200).json({ success: true, data: draft });
  }),
);

// ── POST /onboarding/submit ───────────────────────────────────────────────

router.post(
  '/onboarding/submit',
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.user!.id);
    if (!user) throw new AppError('User not found', 404, 'NOT_FOUND');

    const { ProfileDraft } = await import('../models/ProfileDraft.js');
    const { Profile } = await import('../models/Profile.js');
    const { PartnerProfile } = await import('../models/PartnerProfile.js');
    const { accessService } = await import('../services/AccessService.js');
    const { resolveNextRoute } = await import('@date-to-go/access-policy');

    let draft = await ProfileDraft.findOne({ userId: user._id });
    if (!draft) {
      throw new AppError('No onboarding draft found', 400, 'NO_DRAFT');
    }

    if (req.body.data) {
      draft.data = { ...(draft.data || {}), ...req.body.data };
      draft.markModified('data');
    }
    if (req.body.kycDocuments) {
      draft.kycDocuments = req.body.kycDocuments;
      draft.markModified('kycDocuments');
    }

    const role = user.activeMode || draft.role;

    if (role === 'SEEKER') {
      const data = draft.data || {};
      const displayName = (data.displayName || user.fullName || '').trim();
      if (!displayName || displayName.length < 2) {
        throw new AppError('Name is required (minimum 2 characters)', 400, 'VALIDATION_ERROR');
      }
      const rawGender = (data.gender || user.gender || 'OTHER').toUpperCase();
      const gender = ['MALE', 'FEMALE'].includes(rawGender) ? rawGender : 'OTHER';
      const city = (data.city || user.city || 'Bangalore').trim();
      const interests = Array.isArray(data.interests) ? data.interests : [];
      const photos = Array.isArray(data.photos) ? data.photos : [];
      const preferredGenders = Array.isArray(data.preferredGenders) ? data.preferredGenders : ['OTHER'];

      user.fullName = displayName;
      user.gender = gender as any;
      user.city = city;
      user.onboardingState = 'LIVE';
      user.currentStep = 'COMPLETED';
      await user.save();

      // Check if valid GeoJSON coordinates are provided [longitude, latitude]
      const hasSeekerLocation =
        Array.isArray(data.location?.coordinates) &&
        data.location.coordinates.length === 2 &&
        typeof data.location.coordinates[0] === 'number' &&
        typeof data.location.coordinates[1] === 'number';

      const seekerProfileUpdate: any = {
        userId: user._id,
        role: 'SEEKER',
        displayName: user.fullName,
        gender: user.gender,
        dob: user.dob || new Date('2000-01-01'),
        city: user.city,
        area: data.area || '',
        bio: data.bio || '',
        interests,
        photos,
        primaryPhoto: photos[0] || '',
        preferredGenders,
        budgetPreference: data.budgetPreference,
        publishedAt: new Date(),
      };

      if (hasSeekerLocation) {
        seekerProfileUpdate.location = {
          type: 'Point',
          coordinates: data.location.coordinates,
        };
      } else {
        seekerProfileUpdate.$unset = { location: 1 };
      }

      // Upsert published Profile
      await Profile.findOneAndUpdate(
        { userId: user._id },
        seekerProfileUpdate,
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );

      draft.isCompleted = true;
      draft.submittedAt = new Date();
      await draft.save();

      await accessService.publishAccessChange(user._id.toString(), 'onboarding.completed');

      const nextRoute = resolveNextRoute({
        onboardingState: user.onboardingState,
        currentStep: user.currentStep,
        activeRole: user.activeMode,
        roles: user.roles,
      });

      return res.status(200).json({
        success: true,
        message: 'Seeker profile completed successfully',
        data: {
          role: user.activeMode,
          onboardingState: user.onboardingState,
          nextRoute,
        },
      });
    }

    if (role === 'PARTNER') {
      const data = draft.data || {};
      const displayName = (data.displayName || user.fullName || '').trim();
      if (!displayName || displayName.length < 2) {
        throw new AppError('Display name is required (minimum 2 characters)', 400, 'VALIDATION_ERROR');
      }
      const rawGender = (data.gender || user.gender || 'OTHER').toUpperCase();
      const gender = ['MALE', 'FEMALE'].includes(rawGender) ? rawGender : 'OTHER';
      const city = (data.city || user.city || 'Bangalore').trim();
      const bio = data.bio || '';
      const interests = Array.isArray(data.interests) ? data.interests : [];
      const photos = Array.isArray(data.photos) ? data.photos : [];
      const rates = Array.isArray(data.rates) ? data.rates : (Array.isArray(data.categories) ? data.categories : []);
      const venuePreferences = Array.isArray(data.venuePreferences) ? data.venuePreferences : ['Cafes', 'Public Restaurants'];

      user.fullName = displayName;
      user.gender = gender as any;
      user.city = city;
      user.kycStatus = 'PENDING';
      user.onboardingState = 'LIVE';
      user.currentStep = 'COMPLETED';
      await user.save();

      // Check if valid GeoJSON coordinates are provided [longitude, latitude]
      const hasPartnerLocation =
        Array.isArray(data.location?.coordinates) &&
        data.location.coordinates.length === 2 &&
        typeof data.location.coordinates[0] === 'number' &&
        typeof data.location.coordinates[1] === 'number';

      const partnerUpdate: any = {
        userId: user._id,
        displayName: user.fullName,
        gender: user.gender,
        dob: user.dob,
        city: user.city,
        area: data.area || '',
        bio,
        categories: rates.map((r: any) => ({
          categoryId: r.categoryId,
          hourlyRatePaise: Number(r.hourlyRatePaise) || 100000,
        })),
        interests,
        photos,
        primaryPhoto: photos[0] || '',
        allowedSeekerGenders: data.allowedSeekerGenders || ['MALE', 'FEMALE', 'OTHER'],
        venuePreferences,
        approvalStatus: 'PENDING_REVIEW',
        isListed: true,
        isAvailableNow: true,
      };

      if (hasPartnerLocation) {
        partnerUpdate.location = {
          type: 'Point',
          coordinates: data.location.coordinates,
        };
      } else {
        partnerUpdate.$unset = { location: 1 };
      }

      // Upsert PartnerProfile
      await PartnerProfile.findOneAndUpdate(
        { userId: user._id },
        partnerUpdate,
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );

      const profileUpdate: any = {
        userId: user._id,
        role: 'PARTNER',
        displayName: user.fullName,
        gender: user.gender,
        dob: user.dob || new Date('2000-01-01'),
        city: user.city,
        area: data.area || '',
        bio,
        rates: rates.map((r: any) => ({
          categoryId: r.categoryId,
          hourlyRatePaise: Number(r.hourlyRatePaise) || 100000,
        })),
        interests,
        photos,
        primaryPhoto: photos[0] || '',
        venuePreferences,
        isListed: true,
        publishedAt: new Date(),
      };

      if (hasPartnerLocation) {
        profileUpdate.location = {
          type: 'Point',
          coordinates: data.location.coordinates,
        };
      } else {
        profileUpdate.$unset = { location: 1 };
      }

      // Upsert Profile
      await Profile.findOneAndUpdate(
        { userId: user._id },
        profileUpdate,
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );

      draft.isCompleted = true;
      draft.submittedAt = new Date();
      await draft.save();

      await accessService.publishAccessChange(user._id.toString(), 'onboarding.submitted');

      const snapshot = await accessService.loadAccessSnapshot(user._id.toString());
      const nextRoute = resolveNextRoute(snapshot);

      return res.status(200).json({
        success: true,
        message: 'Partner profile submitted for review',
        data: {
          role: user.activeMode,
          onboardingState: user.onboardingState,
          nextRoute,
        },
      });
    }

    throw new AppError('Unknown onboarding role', 400, 'INVALID_ROLE');
  }),
);

// ── POST /me/mode ─────────────────────────────────────────────────────────

router.post(
  '/me/mode',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { mode } = z.object({ mode: z.enum(['SEEKER', 'PARTNER']) }).parse(req.body);
    const user = await User.findById(req.user!.id);
    if (!user) throw new AppError('User not found', 404, 'NOT_FOUND');

    if (mode === 'PARTNER' && !user.roles.includes('PARTNER')) {
      throw new AppError('PARTNER role required', 403, 'ROLE_REQUIRED');
    }

    user.activeMode = mode as any;
    await user.save();

    const { accessService } = await import('../services/AccessService.js');
    await accessService.publishAccessChange(req.user!.id, 'role.switched');

    res.status(200).json({ success: true, message: 'Mode updated' });
  }),
);

// ── POST /verify-email ────────────────────────────────────────────────────

router.post(
  '/verify-email',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { otp } = VerifyEmailSchema.parse(req.body);
    await authService.verifyEmailOtp(req.user!.id, otp);
    res.status(200).json({ success: true, message: 'Email verified successfully' });
  }),
);

// ── POST /resend-email-otp ────────────────────────────────────────────────

router.post(
  '/resend-email-otp',
  requireAuth,
  authRateLimiter,
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.user!.id).select('email emailVerified');
    if (!user) throw new AppError('User not found', 404, 'NOT_FOUND');
    if (!user.email) {
      throw new AppError('No email associated with this account', 400, 'NO_EMAIL');
    }
    await authService.resendEmailOtp(req.user!.id, user.email);
    res.status(200).json({ success: true, message: 'Verification OTP sent to your email' });
  }),
);

// ── POST /send-phone-otp ──────────────────────────────────────────────────

router.post(
  '/send-phone-otp',
  requireAuth,
  authRateLimiter,
  asyncHandler(async (req, res) => {
    const { phone } = PhoneSchema.parse(req.body);
    await authService.sendPhoneOtp(req.user!.id, phone);
    res.status(200).json({ success: true, message: 'OTP sent to your phone' });
  }),
);

// ── POST /verify-phone-otp ────────────────────────────────────────────────

router.post(
  '/verify-phone-otp',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { phone, otp } = VerifyPhoneSchema.parse(req.body);
    await authService.verifyPhoneOtp(req.user!.id, phone, otp);
    res.status(200).json({ success: true, message: 'Phone verified successfully' });
  }),
);

// ── POST /forgot-password ─────────────────────────────────────────────────

router.post(
  '/forgot-password',
  authRateLimiter,
  asyncHandler(async (req, res) => {
    const { email } = ForgotPasswordSchema.parse(req.body);
    await authService.forgotPassword(email);
    // Always 200 to prevent email enumeration
    res.status(200).json({
      success: true,
      message: 'If an account with that email exists, a reset OTP has been sent.',
    });
  }),
);

// ── POST /reset-password ──────────────────────────────────────────────────

router.post(
  '/reset-password',
  authRateLimiter,
  asyncHandler(async (req, res) => {
    const { email, otp, newPassword } = ResetPasswordSchema.parse(req.body);
    await authService.resetPassword(email, otp, newPassword);
    res.status(200).json({ success: true, message: 'Password reset successfully. Please log in.' });
  }),
);

// ── POST /change-password ─────────────────────────────────────────────────

router.post(
  '/change-password',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = ChangePasswordSchema.parse(req.body);
    await authService.changePassword(req.user!.id, currentPassword, newPassword, req, res);
    res.status(200).json({ success: true, message: 'Password changed. Please log in again.' });
  }),
);

// ── GET /export-data ──────────────────────────────────────────────────────

router.get(
  '/export-data',
  requireAuth,
  asyncHandler(async (req, res) => {
    const data = await authService.exportMyData(req.user!.id);
    res.status(200).json({ success: true, data });
  }),
);

// ── DELETE /account ───────────────────────────────────────────────────────

router.delete(
  '/account',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { password } = DeleteAccountSchema.parse(req.body);
    await authService.deleteAccount(req.user!.id, password, res);
    res.status(200).json({ success: true, message: 'Account deleted. Sorry to see you go.' });
  }),
);

export default router;
