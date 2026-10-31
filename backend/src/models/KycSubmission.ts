import mongoose, { Schema, model, type Document, type Model, type Types } from 'mongoose';

export type KycDocumentType = 'AADHAAR_MASKED' | 'PAN' | 'VOTER_ID' | 'DRIVING_LICENCE' | 'PASSPORT' | 'SELFIE';

export interface IKycDocument {
  type: KycDocumentType;
  storageKey: string;
  mime: string;
  sizeBytes: number;
  uploadedAt: Date;
  idNumberEnc?: string;
  idLast4?: string;
}

export interface IKycSubmission extends Document {
  partnerId: Types.ObjectId;
  status: 'NOT_SUBMITTED' | 'SUBMITTED' | 'UNDER_REVIEW' | 'NEEDS_CHANGES' | 'APPROVED' | 'REJECTED';
  documents: IKycDocument[];
  reviewerId?: Types.ObjectId;
  decision?: 'APPROVE' | 'REJECT' | 'NEEDS_CHANGES';
  reason?: string;
  decidedAt?: Date;
  deleteAfter?: Date; // For document retention job
  createdAt: Date;
  updatedAt: Date;
}

const KycDocumentSchema = new Schema<IKycDocument>({
  type: {
    type: String,
    enum: ['AADHAAR_MASKED', 'PAN', 'VOTER_ID', 'DRIVING_LICENCE', 'PASSPORT', 'SELFIE'],
    required: true,
  },
  storageKey: { type: String, required: true },
  mime: { type: String, required: true },
  sizeBytes: { type: Number, required: true },
  uploadedAt: { type: Date, default: Date.now },
  idNumberEnc: { type: String },
  idLast4: { type: String },
}, { _id: true }); // keep _id for docId lookups

const KycSubmissionSchema = new Schema<IKycSubmission>(
  {
    partnerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    status: {
      type: String,
      enum: ['NOT_SUBMITTED', 'SUBMITTED', 'UNDER_REVIEW', 'NEEDS_CHANGES', 'APPROVED', 'REJECTED'],
      default: 'NOT_SUBMITTED',
    },
    documents: { type: [KycDocumentSchema], default: [] },
    reviewerId: { type: Schema.Types.ObjectId, ref: 'User' },
    decision: { type: String, enum: ['APPROVE', 'REJECT', 'NEEDS_CHANGES'] },
    reason: { type: String },
    decidedAt: { type: Date },
    deleteAfter: { type: Date },
  },
  { timestamps: true }
);

KycSubmissionSchema.index({ status: 1 });
KycSubmissionSchema.index({ deleteAfter: 1 }, { expireAfterSeconds: 0 }); // MongoDB TTL index

export const KycSubmission: Model<IKycSubmission> =
  (mongoose.models['KycSubmission'] as Model<IKycSubmission> | undefined) ??
  model<IKycSubmission>('KycSubmission', KycSubmissionSchema);
