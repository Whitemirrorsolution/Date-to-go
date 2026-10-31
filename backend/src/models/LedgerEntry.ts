import mongoose, { Schema, model, type Document, type Model, type Types } from 'mongoose';

export type LedgerAccount =
  | 'CLIENT_ESCROW'
  | 'PARTNER_PENDING'
  | 'PARTNER_AVAILABLE'
  | 'PLATFORM_REVENUE'
  | 'GST_PAYABLE'
  | 'REFUNDS'
  | 'WITHDRAWALS';

export type LedgerAction = 'PAYMENT_HOLD' | 'PAYMENT_RELEASE' | 'PAYMENT_REFUND' | 'WITHDRAWAL_REQUEST' | 'WITHDRAWAL_COMPLETE';

export interface ILedgerEntry extends Document {
  transactionId: string;
  account: LedgerAccount;
  userId?: Types.ObjectId; // Present for client/partner accounts
  amountPaise: number; // Positive means debit, Negative means credit (or we can use explicit type)
  entryType: 'DEBIT' | 'CREDIT';
  action: LedgerAction;
  refType: 'BOOKING' | 'WITHDRAWAL';
  refId: string;
  createdAt: Date;
}

const LedgerEntrySchema = new Schema<ILedgerEntry>(
  {
    transactionId: { type: String, required: true },
    account: {
      type: String,
      enum: ['CLIENT_ESCROW', 'PARTNER_PENDING', 'PARTNER_AVAILABLE', 'PLATFORM_REVENUE', 'GST_PAYABLE', 'REFUNDS', 'WITHDRAWALS'],
      required: true,
    },
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    amountPaise: { type: Number, required: true, min: 0 },
    entryType: { type: String, enum: ['DEBIT', 'CREDIT'], required: true },
    action: { type: String, required: true },
    refType: { type: String, enum: ['BOOKING', 'WITHDRAWAL'], required: true },
    refId: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// To ensure idempotency: a transactionId + account + entryType + action + refType + refId must be unique.
// Or simpler: transactionId + account + entryType is unique
LedgerEntrySchema.index({ transactionId: 1, account: 1, entryType: 1 }, { unique: true });
LedgerEntrySchema.index({ userId: 1, account: 1, createdAt: -1 });
LedgerEntrySchema.index({ refType: 1, refId: 1 });

export const LedgerEntry: Model<ILedgerEntry> =
  (mongoose.models['LedgerEntry'] as Model<ILedgerEntry> | undefined) ??
  model<ILedgerEntry>('LedgerEntry', LedgerEntrySchema);
