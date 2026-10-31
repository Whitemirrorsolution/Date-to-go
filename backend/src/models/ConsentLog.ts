import mongoose, { Schema, model, type Document, type Model, type Types } from 'mongoose';

// ── Enums ──────────────────────────────────────────────────────────────────

export type ConsentDocumentType = 'TERMS' | 'PRIVACY' | 'COMMUNITY';

// ── Document interface ─────────────────────────────────────────────────────

export interface IConsentLog extends Document {
  userId: Types.ObjectId;
  documentType?: ConsentDocumentType; // deprecated in favor of pageSlug
  pageSlug: string;
  version: number | string;
  acceptedAt: Date;
  ip?: string;
  userAgent?: string;
  createdAt: Date;
}

// ── Schema ─────────────────────────────────────────────────────────────────

const ConsentLogSchema = new Schema<IConsentLog>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    documentType: {
      type: String,
      enum: ['TERMS', 'PRIVACY', 'COMMUNITY'] satisfies ConsentDocumentType[],
    },
    pageSlug: { type: String, required: true },
    version: { type: Schema.Types.Mixed, required: true },
    acceptedAt: { type: Date, required: true, default: Date.now },
    ip: { type: String, trim: true, maxlength: 45 },
    userAgent: { type: String },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
);

// ── Indexes ────────────────────────────────────────────────────────────────

ConsentLogSchema.index({ userId: 1, documentType: 1, version: 1 });
ConsentLogSchema.index({ acceptedAt: -1 });

// ── Model ──────────────────────────────────────────────────────────────────

export const ConsentLog: Model<IConsentLog> =
  (mongoose.models['ConsentLog'] as Model<IConsentLog> | undefined) ??
  model<IConsentLog>('ConsentLog', ConsentLogSchema);
