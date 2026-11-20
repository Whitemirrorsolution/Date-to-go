import mongoose, { Schema, model, type Document, type Model, type Types } from 'mongoose';

export type PayoutStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'APPROVED'
  | 'CONFIRMED'
  | 'PAID'
  | 'REJECTED'
  | 'ON_HOLD'
  | 'FROZEN';

export type PayoutMethod = 'BANK_ACCOUNT' | 'UPI';

export interface IPayoutBankDetails {
  accountHolderName?: string;
  accountNumber?: string;
  bankName?: string;
  ifsc?: string;
  upiId?: string;
}

export interface IPayoutRequest extends Document {
  partnerId: Types.ObjectId;
  amountPaise: number;
  status: PayoutStatus;
  method: PayoutMethod;
  bankDetails: IPayoutBankDetails;
  adminNote?: string;
  utrNumber?: string;
  razorpayPayoutId?: string;
  processedAt?: Date;
  creditedAt?: Date;
  rejectedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const PayoutRequestSchema = new Schema<IPayoutRequest>(
  {
    partnerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    amountPaise: { type: Number, required: true, min: 10000 }, // min 100 INR
    status: {
      type: String,
      enum: ['PENDING', 'PROCESSING', 'APPROVED', 'CONFIRMED', 'PAID', 'REJECTED', 'ON_HOLD', 'FROZEN'],
      default: 'PENDING',
      index: true,
    },
    method: {
      type: String,
      enum: ['BANK_ACCOUNT', 'UPI'],
      default: 'BANK_ACCOUNT',
    },
    bankDetails: {
      accountHolderName: String,
      accountNumber: String,
      bankName: String,
      ifsc: String,
      upiId: String,
    },
    adminNote: { type: String, maxlength: 1000 },
    utrNumber: { type: String, trim: true },
    razorpayPayoutId: String,
    processedAt: Date,
    creditedAt: Date,
    rejectedAt: Date,
  },
  { timestamps: true },
);

PayoutRequestSchema.index({ partnerId: 1, status: 1 });
PayoutRequestSchema.index({ status: 1, createdAt: -1 });

export const PayoutRequest: Model<IPayoutRequest> =
  (mongoose.models['PayoutRequest'] as Model<IPayoutRequest> | undefined) ??
  model<IPayoutRequest>('PayoutRequest', PayoutRequestSchema);
