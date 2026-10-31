import mongoose, { Schema, model, type Document, type Model, type Types } from 'mongoose';

export type StrikeType =
  | 'NUDGE'
  | 'COOLDOWN'
  | 'WARNING'
  | 'CHAT_RESTRICTION'
  | 'VISIBILITY_REDUCTION'
  | 'SUSPENSION';

export type StrikeAppealStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface IUserStrike extends Document {
  userId: Types.ObjectId;
  type: StrikeType;
  reason: string;
  ruleIds?: string[] | undefined;
  expiresAt?: Date | undefined;
  appealed: boolean;
  appealReason?: string | undefined;
  appealStatus?: StrikeAppealStatus | undefined;
  reviewedBy?: Types.ObjectId | undefined;
  reviewedAt?: Date | undefined;
  createdAt: Date;
  updatedAt: Date;
}

const UserStrikeSchema = new Schema<IUserStrike>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: {
      type: String,
      enum: ['NUDGE', 'COOLDOWN', 'WARNING', 'CHAT_RESTRICTION', 'VISIBILITY_REDUCTION', 'SUSPENSION'],
      required: true,
      index: true,
    },
    reason: { type: String, required: true },
    ruleIds: [{ type: String }],
    expiresAt: { type: Date, index: true },
    appealed: { type: Boolean, default: false },
    appealReason: { type: String },
    appealStatus: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED'],
    },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

UserStrikeSchema.index({ userId: 1, type: 1, createdAt: -1 });

export const UserStrike: Model<IUserStrike> =
  (mongoose.models['UserStrike'] as Model<IUserStrike> | undefined) ??
  model<IUserStrike>('UserStrike', UserStrikeSchema);
