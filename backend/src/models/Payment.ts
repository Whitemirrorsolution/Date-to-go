import mongoose, { Schema, model, type Document, type Model, type Types } from 'mongoose';

// ── Enums ──────────────────────────────────────────────────────────────────

export type PaymentPurpose = 'PLAN' | 'BOOKING';
export type PaymentStatus = 'CREATED' | 'CAPTURED' | 'FAILED' | 'REFUNDED';

// ── Document interface ─────────────────────────────────────────────────────

export interface IPayment extends Document {
  userId: Types.ObjectId;
  purpose: PaymentPurpose;
  planId?: Types.ObjectId | undefined;
  bookingId?: Types.ObjectId | undefined;
  razorpayOrderId: string;
  razorpayPaymentId?: string | undefined;
  amountPaise: number;
  status: PaymentStatus;
  invoiceNumber?: string | undefined;
  refundReason?: string | undefined;
  refundId?: string | undefined;
  /** Stores Razorpay webhook event IDs for idempotency */
  rawWebhookEventIds: string[];
  createdAt: Date;
  updatedAt: Date;
}

// ── Schema ─────────────────────────────────────────────────────────────────

const PaymentSchema = new Schema<IPayment>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    purpose: {
      type: String,
      enum: ['PLAN', 'BOOKING'] satisfies PaymentPurpose[],
      required: true,
    },
    planId: { type: Schema.Types.ObjectId, ref: 'Plan' },
    bookingId: { type: Schema.Types.ObjectId, ref: 'Booking' },
    razorpayOrderId: { type: String, required: true, unique: true, trim: true },
    razorpayPaymentId: { type: String, trim: true },
    amountPaise: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ['CREATED', 'CAPTURED', 'FAILED', 'REFUNDED'] satisfies PaymentStatus[],
      default: 'CREATED',
    },
    invoiceNumber: { type: String, trim: true },
    refundReason: { type: String, trim: true },
    refundId: { type: String, trim: true },
    rawWebhookEventIds: { type: [String], default: [] },
  },
  { timestamps: true },
);

// ── Indexes ────────────────────────────────────────────────────────────────

PaymentSchema.index({ userId: 1, status: 1 });
// razorpayOrderId unique index is already created via `unique: true` in the field definition
PaymentSchema.index({ razorpayPaymentId: 1 }, { sparse: true });
PaymentSchema.index({ rawWebhookEventIds: 1 }); // idempotency lookups

// ── Model ──────────────────────────────────────────────────────────────────

export const Payment: Model<IPayment> =
  (mongoose.models['Payment'] as Model<IPayment> | undefined) ??
  model<IPayment>('Payment', PaymentSchema);
