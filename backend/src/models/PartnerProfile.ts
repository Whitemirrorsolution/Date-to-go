import mongoose, { Schema, model, type Document, type Model, type Types } from 'mongoose';

// ── Enums ──────────────────────────────────────────────────────────────────

export type ApprovalStatus = 'DRAFT' | 'PENDING_REVIEW' | 'NEEDS_CHANGES' | 'APPROVED' | 'REJECTED';
export type LifestyleEnum = 'NEVER' | 'OCCASIONALLY' | 'REGULARLY' | 'PREFER_NOT_TO_SAY';
export type DayOfWeek = 'MONDAY' | 'TUESDAY' | 'WEDNESDAY' | 'THURSDAY' | 'FRIDAY' | 'SATURDAY' | 'SUNDAY';

// ── Sub-document interfaces ────────────────────────────────────────────────

export interface ICategoryRate {
  categoryId: Types.ObjectId;
  hourlyRatePaise: number;
}

export interface IWeeklySlot {
  day: DayOfWeek;
  start: string;
  end: string;
}

export interface IAvailability {
  weeklySlots: IWeeklySlot[];
  blockedDates: Date[];
}

export interface IPayoutDetails {
  method: 'BANK_ACCOUNT' | 'UPI';
  accountName?: string;
  accountNumber?: string;
  ifsc?: string;
  upiId?: string;
  isVerified: boolean;
}

// ── Document interface ─────────────────────────────────────────────────────

export interface IPartnerProfile extends Document {
  userId: Types.ObjectId;
  
  // Basic
  displayName: string;
  gender?: string;
  dob?: Date;
  primaryPhoto?: string;
  
  // Location
  city: string;
  pincode?: string;
  area?: string;
  location?: { type: 'Point'; coordinates: [number, number] };
  
  // About
  bio: string;
  occupation?: string;
  industry?: string;
  interests: string[];
  hobbies: string[];
  languages: string[];
  
  // Lifestyle
  smoke?: LifestyleEnum;
  drink?: LifestyleEnum;
  
  // Services & Categories
  categories: ICategoryRate[];
  allowedSeekerGenders: string[];
  
  // Media
  photos: string[];
  
  // Payout
  payoutDetails?: IPayoutDetails;
  
  // Buffers & Availability
  bufferMinutesBefore?: number;
  bufferMinutesAfter?: number;
  
  // Legacy / Booking
  availability: IAvailability;
  isAvailableNow: boolean;
  
  // State
  approvalStatus: ApprovalStatus;
  rejectionReason?: string;
  ratingAvg: number;
  ratingCount: number;
  isListed: boolean;
  
  createdAt: Date;
  updatedAt: Date;
}

// ── Schema ─────────────────────────────────────────────────────────────────

const CategoryRateSchema = new Schema<ICategoryRate>(
  {
    categoryId: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
    hourlyRatePaise: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const PayoutDetailsSchema = new Schema<IPayoutDetails>(
  {
    method: { type: String, enum: ['BANK_ACCOUNT', 'UPI'], required: true },
    accountName: { type: String },
    accountNumber: { type: String },
    ifsc: { type: String },
    upiId: { type: String },
    isVerified: { type: Boolean, default: false },
  },
  { _id: false }
);

const WeeklySlotSchema = new Schema<IWeeklySlot>(
  {
    day: { type: String, required: true },
    start: { type: String, required: true },
    end: { type: String, required: true },
  },
  { _id: false },
);

const PointSchema = new Schema(
  {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true },
  },
  { _id: false },
);

const PartnerProfileSchema = new Schema<IPartnerProfile>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    displayName: { type: String, default: '', trim: true, maxlength: 80 },
    gender: { type: String },
    dob: { type: Date },
    primaryPhoto: { type: String },
    
    city: { type: String, default: '', trim: true, maxlength: 100 },
    pincode: { type: String },
    area: { type: String },
    location: {
      type: PointSchema,
      default: undefined,
      required: false,
    },
    
    bio: { type: String, default: '', trim: true, maxlength: 2000 },
    occupation: { type: String },
    industry: { type: String },
    interests: { type: [String], default: [] },
    hobbies: { type: [String], default: [] },
    languages: { type: [String], default: [] },
    
    smoke: { type: String, enum: ['NEVER', 'OCCASIONALLY', 'REGULARLY', 'PREFER_NOT_TO_SAY'] },
    drink: { type: String, enum: ['NEVER', 'OCCASIONALLY', 'REGULARLY', 'PREFER_NOT_TO_SAY'] },
    
    categories: { type: [CategoryRateSchema], default: [] },
    allowedSeekerGenders: { type: [String], default: [] },
    
    photos: { type: [String], default: [] },
    
    payoutDetails: { type: PayoutDetailsSchema },
    
    bufferMinutesBefore: { type: Number, default: 30, min: 0 },
    bufferMinutesAfter: { type: Number, default: 30, min: 0 },
    
    availability: {
      weeklySlots: { type: [WeeklySlotSchema], default: [] },
      blockedDates: { type: [Date], default: [] },
    },
    isAvailableNow: { type: Boolean, default: false },
    
    approvalStatus: {
      type: String,
      enum: ['DRAFT', 'PENDING_REVIEW', 'NEEDS_CHANGES', 'APPROVED', 'REJECTED'] satisfies ApprovalStatus[],
      default: 'DRAFT',
    },
    rejectionReason: { type: String, trim: true, maxlength: 500 },
    ratingAvg: { type: Number, default: 0, min: 0, max: 5 },
    ratingCount: { type: Number, default: 0, min: 0 },
    isListed: { type: Boolean, default: false },
  },
  { timestamps: true },
);

// ── Indexes ────────────────────────────────────────────────────────────────

PartnerProfileSchema.index({ city: 1, approvalStatus: 1, isListed: 1 });
PartnerProfileSchema.index({ 'categories.categoryId': 1, isListed: 1 });
PartnerProfileSchema.index({ ratingAvg: -1 });
PartnerProfileSchema.index({ location: '2dsphere' });

// ── Model ──────────────────────────────────────────────────────────────────

export const PartnerProfile: Model<IPartnerProfile> =
  (mongoose.models['PartnerProfile'] as Model<IPartnerProfile> | undefined) ??
  model<IPartnerProfile>('PartnerProfile', PartnerProfileSchema);
