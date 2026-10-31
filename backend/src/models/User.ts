import mongoose, { Schema, model, type Document, type Model } from 'mongoose';
import type { RoleName, OnboardingState } from '@date-to-go/access-policy';

// ── Enums ──────────────────────────────────────────────────────────────────

export type UserRole = RoleName;
export type UserMode = 'SEEKER' | 'PARTNER';
export type UserGender = 'MALE' | 'FEMALE' | 'OTHER';
export type UserStatus = 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'DELETED';
export type KycStatus = 'NOT_STARTED' | 'PENDING' | 'VERIFIED' | 'REJECTED';

// ── Sub-document interface ─────────────────────────────────────────────────

export interface IEmergencyContact {
  name: string;
  phone: string;
}

// ── Document interface ─────────────────────────────────────────────────────

export interface IUser extends Document {
  roles: UserRole[];
  activeMode: UserMode;
  onboardingState: OnboardingState;
  currentStep: string;
  roleForkLocked: boolean;
  dobVerified: boolean;
  consentAccepted: boolean;
  fullName: string;
  email?: string;
  phone?: string | undefined;
  passwordHash: string;
  gender: UserGender;
  dob: Date;
  /** Relevant only for role=SEEKER — which genders they want to book */
  preferredGender: UserGender[];
  /** Relevant only for role=PARTNER — which seeker genders they accept */
  allowedSeekerGenders: UserGender[];
  city: string;
  status: UserStatus;
  accessVersion: number;
  emailVerified: boolean;
  phoneVerified: boolean;
  kycStatus: KycStatus;
  /** Opaque reference ID returned by the KYC provider (e.g. DigiLocker session) */
  kycProviderRefId?: string | undefined;
  kycStartedAt?: Date | undefined;
  kycCompletedAt?: Date | undefined;
  /** Increment on logout-all / password change to invalidate old JWTs */
  tokenVersion: number;
  lastLoginAt?: Date | undefined;
  /** Count of consecutive failed login attempts for lockout logic */
  failedLoginAttempts: number;
  /** Epoch ms after which the account is unlocked */
  lockUntil?: Date | undefined;
  emergencyContact?: IEmergencyContact | undefined;
  walletBalancePaise: number;
  createdAt: Date;
  updatedAt: Date;
}

// ── Schema ─────────────────────────────────────────────────────────────────

const EmergencyContactSchema = new Schema<IEmergencyContact>(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    phone: {
      type: String,
      required: true,
      trim: true,
      match: [/^\+?[1-9]\d{6,14}$/, 'Invalid phone number format'],
    },
  },
  { _id: false },
);

const UserSchema = new Schema<IUser>(
  {
    roles: {
      type: [String],
      enum: ['SEEKER', 'PARTNER', 'ADMIN', 'MODERATOR', 'KYC_REVIEWER', 'FINANCE'] satisfies UserRole[],
      required: true,
      default: ['SEEKER'],
    },
    activeMode: {
      type: String,
      enum: ['SEEKER', 'PARTNER'] satisfies UserMode[],
      required: true,
      default: 'SEEKER',
    },
    onboardingState: {
      type: String,
      enum: ['NEW', 'PHONE_VERIFIED', 'FORK', 'IN_PROGRESS', 'SUBMITTED', 'LIVE'] satisfies OnboardingState[],
      required: true,
      default: 'NEW',
      index: true,
    },
    currentStep: {
      type: String,
      default: 'PHONE',
    },
    roleForkLocked: {
      type: Boolean,
      default: false,
    },
    dobVerified: {
      type: Boolean,
      default: false,
    },
    consentAccepted: {
      type: Boolean,
      default: false,
    },
    fullName: {
      type: String,
      default: '',
      trim: true,
      maxlength: 100,
    },
    email: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
    },
    phone: {
      type: String,
      unique: true,
      sparse: true, // allows multiple null values
      trim: true,
      match: [/^\+?[1-9]\d{6,14}$/, 'Invalid phone number format'],
    },
    passwordHash: { type: String, default: '', select: false },
    gender: {
      type: String,
      enum: ['MALE', 'FEMALE', 'OTHER'] satisfies UserGender[],
      default: 'OTHER',
    },
    dob: { type: Date, default: () => new Date('2000-01-01') },
    preferredGender: {
      type: [String],
      enum: ['MALE', 'FEMALE', 'OTHER'] satisfies UserGender[],
      default: [],
    },
    allowedSeekerGenders: {
      type: [String],
      enum: ['MALE', 'FEMALE', 'OTHER'] satisfies UserGender[],
      default: [],
    },
    city: { type: String, default: '', trim: true, maxlength: 100 },
    status: {
      type: String,
      enum: ['PENDING', 'ACTIVE', 'SUSPENDED', 'DELETED'] satisfies UserStatus[],
      default: 'ACTIVE',
    },
    accessVersion: { type: Number, required: true, default: 1 },
    emailVerified: { type: Boolean, default: false },
    phoneVerified: { type: Boolean, default: false },
    kycStatus: {
      type: String,
      enum: ['NOT_STARTED', 'PENDING', 'VERIFIED', 'REJECTED'] satisfies KycStatus[],
      default: 'NOT_STARTED',
    },
    kycProviderRefId: { type: String, trim: true },
    kycStartedAt: { type: Date },
    kycCompletedAt: { type: Date },
    tokenVersion: { type: Number, default: 0 },
    lastLoginAt: { type: Date },
    failedLoginAttempts: { type: Number, default: 0, min: 0 },
    lockUntil: { type: Date },
    emergencyContact: { type: EmergencyContactSchema },
    walletBalancePaise: { type: Number, default: 0, min: 0 },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_doc, ret: Record<string, unknown>) => {
        delete ret['passwordHash'];
        return ret;
      },
    },
  },
);

// ── Indexes ────────────────────────────────────────────────────────────────

// email and phone unique indexes are already created via `unique: true` in the field definitions
UserSchema.index({ role: 1, status: 1 });
UserSchema.index({ city: 1, status: 1 });
UserSchema.index({ kycStatus: 1 });

// ── Model ──────────────────────────────────────────────────────────────────

export const User: Model<IUser> =
  (mongoose.models['User'] as Model<IUser> | undefined) ?? model<IUser>('User', UserSchema);
