import mongoose, { Schema, model, type Document, type Model, type Types } from 'mongoose';

export interface FavoriteDocument extends Document {
  seekerId: Types.ObjectId;
  partnerId: Types.ObjectId;
  sourceListingId?: Types.ObjectId;
  createdAt: Date;
}

const FavoriteSchema = new Schema<FavoriteDocument>({
  seekerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  partnerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  sourceListingId: { type: Schema.Types.ObjectId, ref: 'Listing' },
  createdAt: { type: Date, default: () => new Date() },
});

FavoriteSchema.index({ seekerId: 1, partnerId: 1 }, { unique: true });

export const Favorite: Model<FavoriteDocument> =
  (mongoose.models['Favorite'] as Model<FavoriteDocument> | undefined) ??
  model<FavoriteDocument>('Favorite', FavoriteSchema);
