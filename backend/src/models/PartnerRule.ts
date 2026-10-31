import mongoose, { Schema, model, type Document, type Model, type Types } from 'mongoose';

export type AutoRuleAction = 'AUTO_DECLINE' | 'AUTO_ACCEPT';

export interface IPartnerRuleConditions {
  minLeadTimeHours?: number | undefined;
  maxDistanceKm?: number | undefined;
  allowedPincodes?: string[] | undefined;
  allowedCategoryIds?: (Types.ObjectId | string)[] | undefined;
  minDurationMins?: number | undefined;
  maxDurationMins?: number | undefined;
  blockedTimeRanges?: Array<{ start: string; end: string; days?: string[] | undefined }> | undefined;
  maxDailyBookings?: number | undefined;
  maxWeeklyBookings?: number | undefined;
  verifiedSeekersOnly?: boolean | undefined;
  minSeekerReliability?: 'HIGH' | 'MEDIUM' | undefined;
  noUpheldStrikesLast12Months?: boolean | undefined;
}

export interface IPartnerRule extends Document {
  partnerId: Types.ObjectId;
  name: string;
  description?: string | undefined;
  priority: number; // 1 = highest priority evaluated first
  enabled: boolean;
  action: AutoRuleAction;
  conditions: IPartnerRuleConditions;
  hitCount: number;
  lastFiredAt?: Date | undefined;
  createdAt: Date;
  updatedAt: Date;
}

const PartnerRuleSchema = new Schema<IPartnerRule>(
  {
    partnerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, trim: true, maxlength: 500 },
    priority: { type: Number, required: true, default: 10 },
    enabled: { type: Boolean, default: true },
    action: { type: String, enum: ['AUTO_DECLINE', 'AUTO_ACCEPT'], required: true },
    conditions: {
      minLeadTimeHours: { type: Number, min: 0 },
      maxDistanceKm: { type: Number, min: 0 },
      allowedPincodes: [{ type: String, trim: true }],
      allowedCategoryIds: [{ type: Schema.Types.ObjectId, ref: 'Category' }],
      minDurationMins: { type: Number, min: 15 },
      maxDurationMins: { type: Number, max: 1440 },
      blockedTimeRanges: [
        {
          start: { type: String }, // e.g. "22:00"
          end: { type: String },   // e.g. "06:00"
          days: [{ type: String }],
        },
      ],
      maxDailyBookings: { type: Number, min: 1 },
      maxWeeklyBookings: { type: Number, min: 1 },
      verifiedSeekersOnly: { type: Boolean, default: false },
      minSeekerReliability: { type: String, enum: ['HIGH', 'MEDIUM'] },
      noUpheldStrikesLast12Months: { type: Boolean, default: false },
    },
    hitCount: { type: Number, default: 0 },
    lastFiredAt: { type: Date },
  },
  { timestamps: true }
);

// Indexes
PartnerRuleSchema.index({ partnerId: 1, priority: 1 });
PartnerRuleSchema.index({ partnerId: 1, enabled: 1 });

export const PartnerRule: Model<IPartnerRule> =
  (mongoose.models['PartnerRule'] as Model<IPartnerRule> | undefined) ??
  model<IPartnerRule>('PartnerRule', PartnerRuleSchema);
