import mongoose, { Schema, model, type Document, type Model } from 'mongoose';

export type LedgerEntryType = 'CREDIT' | 'DEBIT' | 'REFUND' | 'ADJUSTMENT';

export interface IWalletLedger extends Document {
  userId: mongoose.Types.ObjectId;
  type: LedgerEntryType;
  amountPaise: number;
  balanceAfterPaise: number;
  reason: string;
  refType: string;
  refId?: string;
  createdAt: Date;
}

const WalletLedgerSchema = new Schema<IWalletLedger>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: {
      type: String,
      enum: ['CREDIT', 'DEBIT', 'REFUND', 'ADJUSTMENT'] satisfies LedgerEntryType[],
      required: true,
    },
    amountPaise: { type: Number, required: true },
    balanceAfterPaise: { type: Number, required: true, min: 0 },
    reason: { type: String, required: true },
    refType: { type: String, required: true },
    refId: { type: String },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// We need to efficiently query a user's ledger sorted by time
WalletLedgerSchema.index({ userId: 1, createdAt: -1 });

export const WalletLedger: Model<IWalletLedger> =
  (mongoose.models['WalletLedger'] as Model<IWalletLedger> | undefined) ??
  model<IWalletLedger>('WalletLedger', WalletLedgerSchema);
