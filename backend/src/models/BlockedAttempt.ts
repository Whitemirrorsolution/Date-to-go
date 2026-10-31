import mongoose, { Schema, model, type Document, type Model, type Types } from 'mongoose';

export interface IBlockedAttempt extends Document {
  userId: Types.ObjectId;
  bookingId?: Types.ObjectId | undefined;
  conversationId?: Types.ObjectId | undefined;
  normalizedTextExcerpt: string;
  ruleIds: string[];
  score: number;
  createdAt: Date;
}

const BlockedAttemptSchema = new Schema<IBlockedAttempt>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    bookingId: { type: Schema.Types.ObjectId, ref: 'Booking', index: true },
    conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation', index: true },
    normalizedTextExcerpt: { type: String, required: true, maxlength: 300 },
    ruleIds: [{ type: String, required: true }],
    score: { type: Number, required: true },
    createdAt: { type: Date, default: () => new Date(), index: true },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

BlockedAttemptSchema.index({ userId: 1, createdAt: -1 });

export const BlockedAttempt: Model<IBlockedAttempt> =
  (mongoose.models['BlockedAttempt'] as Model<IBlockedAttempt> | undefined) ??
  model<IBlockedAttempt>('BlockedAttempt', BlockedAttemptSchema);
