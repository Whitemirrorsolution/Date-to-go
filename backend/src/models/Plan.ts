import mongoose, { Schema, model, type Document, type Model } from 'mongoose';

// ── Enums ──────────────────────────────────────────────────────────────────

export type PlanAudience = 'SEEKER' | 'PARTNER' | 'BOTH';

// ── Document interface ─────────────────────────────────────────────────────

export interface IPlan extends Document {
  name: string;
  audience: PlanAudience;
  pricePaise: number;
  durationDays: number;
  features: string[];
  /** Max bookings allowed per billing period; 0 = unlimited */
  bookingLimit: number;
  /** Max daily booking requests a USER can send; 0 = unlimited */
  dailyRequestLimit: number;
  /** Max different categories a PARTNER can list; 0 = unlimited */
  maxCategoriesAllowed: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ── Schema ─────────────────────────────────────────────────────────────────

const PlanSchema = new Schema<IPlan>(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    audience: {
      type: String,
      enum: ['SEEKER', 'PARTNER', 'BOTH'] satisfies PlanAudience[],
      required: true,
    },
    pricePaise: { type: Number, required: true, min: 0 },
    durationDays: { type: Number, required: true, min: 1 },
    features: { type: [String], default: [] },
    bookingLimit: { type: Number, required: true, min: 0, default: 0 },
    dailyRequestLimit: { type: Number, required: true, min: 0, default: 0 },
    maxCategoriesAllowed: { type: Number, required: true, min: 0, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true },
);

// ── Indexes ────────────────────────────────────────────────────────────────

PlanSchema.index({ audience: 1, isActive: 1 });

// ── Model ──────────────────────────────────────────────────────────────────

export const Plan: Model<IPlan> =
  (mongoose.models['Plan'] as Model<IPlan> | undefined) ?? model<IPlan>('Plan', PlanSchema);
