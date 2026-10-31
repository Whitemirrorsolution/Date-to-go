import mongoose, { Schema, model, type Document, type Model, type Types } from 'mongoose';

// ── Document interface ─────────────────────────────────────────────────────

export interface IReview extends Document {
  bookingId: Types.ObjectId;
  fromUserId: Types.ObjectId;
  toUserId: Types.ObjectId;
  userId?: Types.ObjectId;
  partnerId?: Types.ObjectId;
  rating: number;
  comment: string;
  /** Set to true when comment has been reviewed/approved by moderation */
  moderated: boolean;
  isApproved: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ── Schema ─────────────────────────────────────────────────────────────────

const ReviewSchema = new Schema<IReview>(
  {
    bookingId: { type: Schema.Types.ObjectId, ref: 'Booking', required: true },
    fromUserId: { type: Schema.Types.ObjectId, ref: 'User' },
    toUserId: { type: Schema.Types.ObjectId, ref: 'User' },
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    partnerId: { type: Schema.Types.ObjectId, ref: 'User' },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, trim: true, maxlength: 1000, default: '' },
    moderated: { type: Boolean, default: false },
    isApproved: { type: Boolean, default: true },
  },
  { timestamps: true },
);

// Pre-validate hook to guarantee both pairs (fromUserId/toUserId and userId/partnerId) are populated
ReviewSchema.pre('validate', function (next) {
  if (!this.fromUserId && this.userId) {
    this.fromUserId = this.userId;
  }
  if (!this.userId && this.fromUserId) {
    this.userId = this.fromUserId;
  }
  if (!this.toUserId && this.partnerId) {
    this.toUserId = this.partnerId;
  }
  if (!this.partnerId && this.toUserId) {
    this.partnerId = this.toUserId;
  }

  // Ensure fromUserId and toUserId exist
  if (!this.fromUserId) {
    this.invalidate('fromUserId', 'Path `fromUserId` is required.');
  }
  if (!this.toUserId) {
    this.invalidate('toUserId', 'Path `toUserId` is required.');
  }

  next();
});

// ── Indexes ────────────────────────────────────────────────────────────────

ReviewSchema.index({ bookingId: 1, fromUserId: 1 }, { unique: true, sparse: true });
ReviewSchema.index({ bookingId: 1, userId: 1 }, { unique: true, sparse: true });
ReviewSchema.index({ toUserId: 1 });
ReviewSchema.index({ partnerId: 1 });
ReviewSchema.index({ moderated: 1 });
ReviewSchema.index({ isApproved: 1 });

// ── Model ──────────────────────────────────────────────────────────────────

export const Review: Model<IReview> =
  (mongoose.models['Review'] as Model<IReview> | undefined) ??
  model<IReview>('Review', ReviewSchema);
