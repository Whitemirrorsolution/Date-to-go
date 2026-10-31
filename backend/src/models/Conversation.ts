import mongoose, { Schema, model, type Document, type Model, type Types } from 'mongoose';

export type ConversationStatus = 'LOCKED' | 'OPEN' | 'READ_ONLY' | 'CLOSED';

export interface IConversation extends Document {
  bookingId: Types.ObjectId;
  seekerId: Types.ObjectId;
  partnerId: Types.ObjectId;
  status: ConversationStatus;
  openedAt?: Date;
  closeAt?: Date;
  lastMessageAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ConversationSchema = new Schema<IConversation>(
  {
    bookingId: { type: Schema.Types.ObjectId, ref: 'Booking', required: true, unique: true, index: true },
    seekerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    partnerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    status: {
      type: String,
      enum: ['LOCKED', 'OPEN', 'READ_ONLY', 'CLOSED'],
      default: 'LOCKED',
      required: true,
      index: true,
    },
    openedAt: { type: Date },
    closeAt: { type: Date },
    lastMessageAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

ConversationSchema.index({ seekerId: 1, partnerId: 1 });

export const Conversation: Model<IConversation> =
  (mongoose.models['Conversation'] as Model<IConversation> | undefined) ??
  model<IConversation>('Conversation', ConversationSchema);
