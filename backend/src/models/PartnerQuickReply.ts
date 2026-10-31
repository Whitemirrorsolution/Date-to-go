import mongoose, { Schema, model, type Document, type Model, type Types } from 'mongoose';

export type QuickReplyType = 'ACCEPT_NOTE' | 'DECLINE_REASON' | 'CHAT_REPLY';

export interface IPartnerQuickReply extends Document {
  partnerId: Types.ObjectId;
  type: QuickReplyType;
  title: string;
  content: string;
  shortcut?: string;
  order: number;
  isDefault: boolean;
  useCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const PartnerQuickReplySchema = new Schema<IPartnerQuickReply>(
  {
    partnerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: ['ACCEPT_NOTE', 'DECLINE_REASON', 'CHAT_REPLY'], required: true },
    title: { type: String, required: true, trim: true, maxlength: 100 },
    content: { type: String, required: true, trim: true, maxlength: 1000 },
    shortcut: { type: String, trim: true, maxlength: 30 },
    order: { type: Number, default: 0 },
    isDefault: { type: Boolean, default: false },
    useCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

PartnerQuickReplySchema.index({ partnerId: 1, type: 1, order: 1 });

export const PartnerQuickReply: Model<IPartnerQuickReply> =
  (mongoose.models['PartnerQuickReply'] as Model<IPartnerQuickReply> | undefined) ??
  model<IPartnerQuickReply>('PartnerQuickReply', PartnerQuickReplySchema);
