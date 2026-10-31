import mongoose, { Schema, model, type Document, type Model, type Types } from 'mongoose';

export type SafetyCheckStatus = 'PENDING' | 'RESOLVED' | 'ESCALATED';
export type SafetyCheckTrigger = 'SYSTEM' | 'CLIENT' | 'PARTNER';

export interface ISafetyCheck extends Document {
  bookingId: Types.ObjectId;
  status: SafetyCheckStatus;
  triggeredBy: SafetyCheckTrigger;
  triggerUserId?: Types.ObjectId;
  resolutionNote?: string;
  resolvedAt?: Date;
  resolvedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const SafetyCheckSchema = new Schema<ISafetyCheck>(
  {
    bookingId: { type: Schema.Types.ObjectId, ref: 'Booking', required: true },
    status: {
      type: String,
      enum: ['PENDING', 'RESOLVED', 'ESCALATED'],
      default: 'PENDING',
    },
    triggeredBy: {
      type: String,
      enum: ['SYSTEM', 'CLIENT', 'PARTNER'],
      required: true,
    },
    triggerUserId: { type: Schema.Types.ObjectId, ref: 'User' },
    resolutionNote: { type: String, maxlength: 1000 },
    resolvedAt: { type: Date },
    resolvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

SafetyCheckSchema.index({ bookingId: 1 });
SafetyCheckSchema.index({ status: 1 });
SafetyCheckSchema.index({ createdAt: 1 });

export const SafetyCheck: Model<ISafetyCheck> =
  (mongoose.models['SafetyCheck'] as Model<ISafetyCheck> | undefined) ??
  model<ISafetyCheck>('SafetyCheck', SafetyCheckSchema);
