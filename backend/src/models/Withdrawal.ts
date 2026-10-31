import mongoose, { Schema, model, type Document, type Model, type Types } from 'mongoose';

export type WithdrawalStatus = 'REQUESTED' | 'APPROVED' | 'PROCESSING' | 'PAID' | 'FAILED' | 'REJECTED';
export type WithdrawalMethod = 'BANK_ACCOUNT' | 'UPI';

export interface IWithdrawal extends Document {
  partnerId: Types.ObjectId;
  amountPaise: number;
  status: WithdrawalStatus;
  method: WithdrawalMethod;
  destinationSnapshotMasked: string; // e.g. "HDFC Bank ending in 1234" or "UPI: xxx@okhdfcbank"
  providerRef?: string;
  failureReason?: string;
  requestedAt: Date;
  processedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const WithdrawalSchema = new Schema<IWithdrawal>(
  {
    partnerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    amountPaise: { type: Number, required: true, min: 100 },
    status: {
      type: String,
      enum: ['REQUESTED', 'APPROVED', 'PROCESSING', 'PAID', 'FAILED', 'REJECTED'],
      default: 'REQUESTED',
    },
    method: {
      type: String,
      enum: ['BANK_ACCOUNT', 'UPI'],
      required: true,
    },
    destinationSnapshotMasked: { type: String, required: true },
    providerRef: { type: String },
    failureReason: { type: String, maxlength: 500 },
    requestedAt: { type: Date, default: Date.now },
    processedAt: { type: Date },
  },
  { timestamps: true }
);

WithdrawalSchema.index({ partnerId: 1, status: 1 });
WithdrawalSchema.index({ status: 1 });
WithdrawalSchema.index({ requestedAt: 1 });

export const Withdrawal: Model<IWithdrawal> =
  (mongoose.models['Withdrawal'] as Model<IWithdrawal> | undefined) ??
  model<IWithdrawal>('Withdrawal', WithdrawalSchema);
