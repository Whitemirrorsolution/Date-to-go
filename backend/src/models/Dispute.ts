import mongoose, { Schema, model, type Document, type Model, type Types } from 'mongoose';

export type DisputeStatus = 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED' | 'APPEALED' | 'CLOSED';
export type DisputeResolution = 'FULL_REFUND' | 'RELEASE_TO_PARTNER' | 'SPLIT';

export interface IDispute extends Document {
  bookingId: Types.ObjectId;
  raisedBy: Types.ObjectId;
  targetId: Types.ObjectId;
  reason: string;
  evidence: string[]; // Signed URLs/Keys to evidence files
  status: DisputeStatus;
  adminId?: Types.ObjectId;
  resolution?: DisputeResolution;
  splitPercentageClient?: number;
  splitPercentagePartner?: number;
  resolutionReason?: string;
  resolvedAt?: Date;
  appealCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const DisputeSchema = new Schema<IDispute>(
  {
    bookingId: { type: Schema.Types.ObjectId, ref: 'Booking', required: true, unique: true },
    raisedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    targetId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    reason: { type: String, required: true, maxlength: 1000 },
    evidence: { type: [String], default: [] },
    status: {
      type: String,
      enum: ['OPEN', 'UNDER_REVIEW', 'RESOLVED', 'APPEALED', 'CLOSED'],
      default: 'OPEN',
    },
    adminId: { type: Schema.Types.ObjectId, ref: 'User' },
    resolution: { type: String, enum: ['FULL_REFUND', 'RELEASE_TO_PARTNER', 'SPLIT'] },
    splitPercentageClient: { type: Number, min: 0, max: 100 },
    splitPercentagePartner: { type: Number, min: 0, max: 100 },
    resolutionReason: { type: String, maxlength: 1000 },
    resolvedAt: { type: Date },
    appealCount: { type: Number, default: 0, max: 1 },
  },
  { timestamps: true }
);

DisputeSchema.index({ bookingId: 1, status: 1 });
DisputeSchema.index({ raisedBy: 1 });
DisputeSchema.index({ status: 1 });

export const Dispute: Model<IDispute> =
  (mongoose.models['Dispute'] as Model<IDispute> | undefined) ??
  model<IDispute>('Dispute', DisputeSchema);
