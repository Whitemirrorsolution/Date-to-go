import mongoose, { Schema, model, type Document, type Model, type Types } from 'mongoose';

export type ProfileDraftRole = 'SEEKER' | 'PARTNER';

export interface IKycDocumentDraft {
  docType: 'AADHAAR' | 'PAN' | 'PASSPORT' | 'DRIVING_LICENCE' | 'VOTER_ID' | 'SELFIE';
  fileUrl: string;
  status: 'PENDING' | 'VERIFIED' | 'REJECTED';
  uploadedAt: Date;
}

export interface IProfileDraft extends Document {
  userId: Types.ObjectId;
  role: ProfileDraftRole;
  step: string;
  data: Record<string, any>;
  kycDocuments: IKycDocumentDraft[];
  isCompleted: boolean;
  submittedAt?: Date;
  version: number;
  rejectionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const KycDocumentDraftSchema = new Schema<IKycDocumentDraft>(
  {
    docType: {
      type: String,
      enum: ['AADHAAR', 'PAN', 'PASSPORT', 'DRIVING_LICENCE', 'VOTER_ID', 'SELFIE'],
      required: true,
    },
    fileUrl: { type: String, required: true },
    status: {
      type: String,
      enum: ['PENDING', 'VERIFIED', 'REJECTED'],
      default: 'PENDING',
    },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

const ProfileDraftSchema = new Schema<IProfileDraft>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    role: { type: String, enum: ['SEEKER', 'PARTNER'], required: true },
    step: { type: String, default: 'BASICS' },
    data: { type: Schema.Types.Mixed, default: {} },
    kycDocuments: { type: [KycDocumentDraftSchema], default: [] },
    isCompleted: { type: Boolean, default: false },
    submittedAt: { type: Date },
    version: { type: Number, default: 1 },
    rejectionReason: { type: String },
  },
  { timestamps: true },
);

export const ProfileDraft: Model<IProfileDraft> =
  (mongoose.models['ProfileDraft'] as Model<IProfileDraft> | undefined) ??
  model<IProfileDraft>('ProfileDraft', ProfileDraftSchema);
