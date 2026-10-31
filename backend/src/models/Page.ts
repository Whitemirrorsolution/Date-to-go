import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IPage extends Document {
  slug: 'privacy' | 'terms' | 'code-of-conduct' | 'refund-policy' | 'safety-guidelines' | 'about';
  title: string;
  subtitle?: string;
  version: number;
  status: 'DRAFT' | 'PUBLISHED';
  effectiveDate?: Date;
  blocks: any[];
  requiresConsent: boolean;
  history: Array<{
    version: number;
    blocks: any[];
    publishedBy: mongoose.Types.ObjectId;
    publishedAt: Date;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const PageSchema = new Schema<IPage>(
  {
    slug: {
      type: String,
      enum: ['privacy', 'terms', 'code-of-conduct', 'refund-policy', 'safety-guidelines', 'about'],
      required: true,
      unique: true,
    },
    title: { type: String, required: true },
    subtitle: { type: String },
    version: { type: Number, default: 1 },
    status: { type: String, enum: ['DRAFT', 'PUBLISHED'], default: 'DRAFT' },
    effectiveDate: { type: Date },
    blocks: { type: Schema.Types.Mixed, default: [] }, // Flexible JSON for blocks
    requiresConsent: { type: Boolean, default: false },
    history: [
      {
        version: { type: Number },
        blocks: { type: Schema.Types.Mixed },
        publishedBy: { type: Schema.Types.ObjectId, ref: 'User' },
        publishedAt: { type: Date },
      }
    ],
  },
  { timestamps: true }
);

export const Page: Model<IPage> = mongoose.model<IPage>('Page', PageSchema);
