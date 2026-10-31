import mongoose, { Schema, model, type Document, type Model } from 'mongoose';

export type TemplateRole = 'ALL' | 'SEEKER' | 'PARTNER';

export interface IQuickReplyTemplate extends Document {
  key: string;
  textEn: string;
  textHi: string;
  phases: string[]; // e.g. ['ACCEPTED', 'IN_PROGRESS', 'PAID']
  role: TemplateRole;
  enabled: boolean;
  order: number;
}

const QuickReplyTemplateSchema = new Schema<IQuickReplyTemplate>(
  {
    key: { type: String, required: true, unique: true, trim: true },
    textEn: { type: String, required: true, trim: true },
    textHi: { type: String, required: true, trim: true },
    phases: [{ type: String, required: true }],
    role: { type: String, enum: ['ALL', 'SEEKER', 'PARTNER'], default: 'ALL' },
    enabled: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

QuickReplyTemplateSchema.index({ enabled: 1, role: 1 });

export const QuickReplyTemplate: Model<IQuickReplyTemplate> =
  (mongoose.models['QuickReplyTemplate'] as Model<IQuickReplyTemplate> | undefined) ??
  model<IQuickReplyTemplate>('QuickReplyTemplate', QuickReplyTemplateSchema);
