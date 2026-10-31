import mongoose, { Schema, model, type Document, type Model, type Types } from 'mongoose';

export type LedgerType = 'DEPOSIT' | 'WITHDRAWAL' | 'EARNING' | 'REFUND' | 'COMMISSION';
export type LedgerStatus = 'PENDING' | 'COMPLETED' | 'FAILED';

export interface ILedger extends Document {
  userId: Types.ObjectId;
  type: LedgerType | string;
  amountPaise: number;
  balancePaise?: number;
  description?: string;
  referenceId?: Types.ObjectId | string;
  status: LedgerStatus | string;
  createdAt: Date;
  updatedAt: Date;
}

const LedgerSchema = new Schema<ILedger>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, required: true },
    amountPaise: { type: Number, required: true },
    balancePaise: { type: Number, default: 0 },
    description: { type: String },
    referenceId: { type: Schema.Types.Mixed },
    status: { type: String, default: 'COMPLETED' },
  },
  { timestamps: true }
);

LedgerSchema.index({ userId: 1, createdAt: -1 });

export const Ledger: Model<ILedger> =
  (mongoose.models['Ledger'] as Model<ILedger> | undefined) ??
  model<ILedger>('Ledger', LedgerSchema);
