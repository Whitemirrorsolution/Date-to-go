import mongoose, { Schema, model, type Document, type Model, type Types } from 'mongoose';

export type MessageKind = 'TEXT' | 'QUICK_REPLY' | 'SYSTEM' | 'LOCATION_PIN';

export interface IMessageModeration {
  decision: 'ALLOW' | 'ALLOW_AND_FLAG' | 'BLOCK';
  score?: number;
  ruleIds?: string[];
  lexiconVersion?: number;
}

export interface IMessage extends Document {
  bookingId: Types.ObjectId;
  conversationId?: Types.ObjectId;
  senderId: Types.ObjectId;
  recipientId?: Types.ObjectId;
  kind: MessageKind;
  text: string;
  quickReplyKey?: string;
  moderation?: IMessageModeration;
  /** True when the message has been flagged by moderation/NLP for review */
  flagged: boolean;
  deliveredAt?: Date;
  readAt?: Date;
  deleteAfter?: Date;
  createdAt: Date;
}

const MessageSchema = new Schema<IMessage>(
  {
    bookingId: { type: Schema.Types.ObjectId, ref: 'Booking', required: true, index: true },
    conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation', index: true },
    senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    recipientId: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    kind: {
      type: String,
      enum: ['TEXT', 'QUICK_REPLY', 'SYSTEM', 'LOCATION_PIN'],
      default: 'TEXT',
      required: true,
    },
    text: { type: String, required: true, trim: true, maxlength: 2000 },
    quickReplyKey: { type: String, trim: true },
    moderation: {
      decision: { type: String, enum: ['ALLOW', 'ALLOW_AND_FLAG', 'BLOCK'] },
      score: { type: Number },
      ruleIds: [{ type: String }],
      lexiconVersion: { type: Number },
    },
    flagged: { type: Boolean, default: false },
    deliveredAt: { type: Date, default: () => new Date() },
    readAt: { type: Date },
    deleteAfter: { type: Date, index: true },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

MessageSchema.index({ bookingId: 1, createdAt: 1 });
MessageSchema.index({ conversationId: 1, createdAt: 1 });
MessageSchema.index({ flagged: 1, createdAt: -1 });

export const Message: Model<IMessage> =
  (mongoose.models['Message'] as Model<IMessage> | undefined) ??
  model<IMessage>('Message', MessageSchema);
