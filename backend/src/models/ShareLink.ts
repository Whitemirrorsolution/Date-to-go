import mongoose, { Schema, model, type Document, type Model, type Types } from 'mongoose';

/**
 * ShareLink — a short-lived, no-auth booking share link for trusted contacts.
 * Expires when the booking ends. Reveals only safe data (partner first name, place, time).
 */
export interface IShareLink extends Document {
  token: string;         // random UUID, used in URL
  bookingId: Types.ObjectId;
  createdBy: Types.ObjectId;
  expiresAt: Date;
  lastAccessedAt?: Date;
  accessCount: number;
  createdAt: Date;
}

const ShareLinkSchema = new Schema<IShareLink>(
  {
    token: { type: String, required: true, unique: true, index: true },
    bookingId: { type: Schema.Types.ObjectId, ref: 'Booking', required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    expiresAt: { type: Date, required: true, index: true },
    lastAccessedAt: { type: Date },
    accessCount: { type: Number, default: 0 },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// TTL index — MongoDB auto-deletes expired docs
ShareLinkSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const ShareLink: Model<IShareLink> =
  (mongoose.models['ShareLink'] as Model<IShareLink> | undefined) ??
  model<IShareLink>('ShareLink', ShareLinkSchema);
