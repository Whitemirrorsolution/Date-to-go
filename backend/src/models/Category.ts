import mongoose, { Schema, model, type Document, type Model } from 'mongoose';

// ── Types ──────────────────────────────────────────────────────────────────

export type CommissionType = 'PERCENT' | 'FLAT' | 'MIXED';

export interface ICommissionRule {
  type: CommissionType;
  percentBps?: number;
  flatPaise?: number;
  minFeePaise?: number;
  maxFeePaise?: number;
  gstOnFeeBps: number;
  effectiveFrom: Date;
}

// ── Document interface ─────────────────────────────────────────────────────

export interface ICategory extends Document {
  name: string;
  slug: string;
  icon: string;
  description: string;
  accentColor?: string;
  order: number;
  isActive: boolean;
  minRatePaise: number;
  maxRatePaise: number;
  defaultRatePaise: number;
  allowedDurationsMins: number[];
  requiresExtraKyc: boolean;
  allowClientHomeVenue: boolean;
  safetyNotes?: string;
  cancellationPolicyRef?: string;
  commissionRules: ICommissionRule[];
  createdAt: Date;
  updatedAt: Date;
}

export const DEFAULT_CATEGORIES = [
  { name: 'City Tour', slug: 'city-tour', icon: 'map', description: 'Explore local landmarks and neighborhoods.', order: 1 },
  { name: 'Coffee', slug: 'coffee', icon: 'coffee', description: 'Meet for coffee and conversation in a public cafe.', order: 2 },
  { name: 'Movie', slug: 'movie', icon: 'film', description: 'Attend a public movie screening together.', order: 3 },
  { name: 'Event', slug: 'event', icon: 'ticket', description: 'Go together to a public event or exhibition.', order: 4 },
  { name: 'Walking', slug: 'walking', icon: 'footprints', description: 'Take a walk through a public park or promenade.', order: 5 },
  { name: 'Dinner', slug: 'dinner', icon: 'utensils', description: 'Share a meal at a public restaurant.', order: 6 },
  { name: 'Senior Support', slug: 'senior-support', icon: 'heart-handshake', description: 'Companionship and assistance for seniors in public settings.', order: 7 },
  { name: 'Errands', slug: 'errands', icon: 'shopping-bag', description: 'Get company while completing everyday errands.', order: 8 },
].map((category) => ({
  ...category,
  minRatePaise: 50_000,
  maxRatePaise: 500_000,
  defaultRatePaise: 150_000,
}));

// ── Schema ─────────────────────────────────────────────────────────────────

const CommissionRuleSchema = new Schema<ICommissionRule>({
  type: { type: String, enum: ['PERCENT', 'FLAT', 'MIXED'], required: true },
  percentBps: { type: Number },
  flatPaise: { type: Number },
  minFeePaise: { type: Number },
  maxFeePaise: { type: Number },
  gstOnFeeBps: { type: Number, required: true, default: 1800 },
  effectiveFrom: { type: Date, required: true },
});

const CategorySchema = new Schema<ICategory>(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric with hyphens only'],
    },
    icon: { type: String, required: true, default: '🏷️' },
    description: { type: String, required: true, trim: true, maxlength: 500 },
    accentColor: { type: String, match: [/^#[0-9A-Fa-f]{6}$/, 'Invalid HEX'] },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    minRatePaise: { type: Number, required: true, default: 100000 },
    maxRatePaise: { type: Number, required: true, default: 1000000 },
    defaultRatePaise: { type: Number, required: true, default: 150000 },
    allowedDurationsMins: { type: [Number], default: [60, 120, 180, 240, 300, 360, 420, 480] },
    requiresExtraKyc: { type: Boolean, default: false },
    allowClientHomeVenue: { type: Boolean, default: false },
    safetyNotes: { type: String },
    cancellationPolicyRef: { type: String },
    commissionRules: { type: [CommissionRuleSchema], default: [] },
  },
  { timestamps: true },
);

// ── Indexes ────────────────────────────────────────────────────────────────

CategorySchema.index({ isActive: 1 });
CategorySchema.index({ order: 1 });

// ── Model ──────────────────────────────────────────────────────────────────

export const Category: Model<ICategory> =
  (mongoose.models['Category'] as Model<ICategory> | undefined) ??
  model<ICategory>('Category', CategorySchema);
