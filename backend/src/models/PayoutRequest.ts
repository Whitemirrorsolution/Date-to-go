import mongoose, { Schema, model, type Document, type Model, type Types } from 'mongoose';

export type PayoutStatus = 'PENDING' | 'APPROVED' | 'PAID' | 'REJECTED';

export interface IPayoutRequest extends Document {
  partnerId: Types.ObjectId;
  amountPaise: number;
  status: PayoutStatus;
  bankDetails: {
    accountNumber?: string;
    ifsc?: string;
    upiId?: string;
  };
  adminNote?: string;
  razorpayPayoutId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PayoutRequestSchema = new Schema<IPayoutRequest>(
  {
    partnerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    amountPaise: { type: Number, required: true, min: 100000 }, // min 1000 INR
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'PAID', 'REJECTED'],
      default: 'PENDING',
    },
    bankDetails: {
      accountNumber: String,
      ifsc: String,
      upiId: String,
    },
    adminNote: { type: String, maxlength: 500 },
    razorpayPayoutId: String,
  },
  { timestamps: true },
);

PayoutRequestSchema.index({ partnerId: 1, status: 1 });
PayoutRequestSchema.index({ status: 1 });

export const PayoutRequest: Model<IPayoutRequest> =
  (mongoose.models['PayoutRequest'] as Model<IPayoutRequest> | undefined) ??
  model<IPayoutRequest>('PayoutRequest', PayoutRequestSchema);
