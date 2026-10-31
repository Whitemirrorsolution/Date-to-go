import mongoose, { Schema, model, type Document, type Model, type Types } from 'mongoose';

export interface DeckInteractionDocument extends Document {
  seekerId: Types.ObjectId;
  listingId: Types.ObjectId;
  partnerId: Types.ObjectId;
  action: 'SKIP' | 'SAVE' | 'UNDO';
  createdAt: Date;
  undoOf?: Types.ObjectId;
}

const DeckInteractionSchema = new Schema<DeckInteractionDocument>({
  seekerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  listingId: { type: Schema.Types.ObjectId, ref: 'Listing', required: true, index: true },
  partnerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  action: { type: String, enum: ['SKIP', 'SAVE', 'UNDO'], required: true },
  createdAt: { type: Date, default: () => new Date() },
  undoOf: { type: Schema.Types.ObjectId, ref: 'DeckInteraction' },
});

DeckInteractionSchema.index({ seekerId: 1, listingId: 1 }, { unique: true });

export const DeckInteraction: Model<DeckInteractionDocument> =
  (mongoose.models['DeckInteraction'] as Model<DeckInteractionDocument> | undefined) ??
  model<DeckInteractionDocument>('DeckInteraction', DeckInteractionSchema);
