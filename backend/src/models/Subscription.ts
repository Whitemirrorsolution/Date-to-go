import mongoose, { Schema, model, type Document, type Model, type Types } from 'mongoose';

// ── Enums ──────────────────────────────────────────────────────────────────

export type SubscriptionStatus = 'ACTIVE' | 'EXPIRED' | 'CANCELLED';

// ── Document interface ─────────────────────────────────────────────────────

export interface ISubscription extends Document {
  userId: Types.ObjectId;
  planId: Types.ObjectId;
  status: SubscriptionStatus;
  startsAt: Date;
  endsAt?: Date | null;
  paymentId: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// ── Schema ─────────────────────────────────────────────────────────────────

const SubscriptionSchema = new Schema<ISubscription>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    planId: { type: Schema.Types.ObjectId, ref: 'Plan', required: true },
    status: {
      type: String,
      enum: ['ACTIVE', 'EXPIRED', 'CANCELLED'] satisfies SubscriptionStatus[],
      default: 'ACTIVE',
    },
    startsAt: { type: Date, required: true },
    endsAt: { type: Date },
    paymentId: { type: Schema.Types.ObjectId, ref: 'Payment', required: true },
  },
  { timestamps: true },
);

// ── Indexes ────────────────────────────────────────────────────────────────

SubscriptionSchema.index({ userId: 1, status: 1 });
SubscriptionSchema.index({ endsAt: 1 }); // TTL-like queries for expiry jobs
SubscriptionSchema.index({ paymentId: 1 });

// ── Model ──────────────────────────────────────────────────────────────────

export const Subscription: Model<ISubscription> =
  (mongoose.models['Subscription'] as Model<ISubscription> | undefined) ??
  model<ISubscription>('Subscription', SubscriptionSchema);
