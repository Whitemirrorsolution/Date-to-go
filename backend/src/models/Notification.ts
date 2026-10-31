import mongoose, { Schema, model, type Document, type Model, type Types } from 'mongoose';

// ── Document interface ─────────────────────────────────────────────────────

export interface INotification extends Document {
  userId: Types.ObjectId;
  type: string;
  title: string;
  body: string;
  readAt?: Date;
  createdAt: Date;
}

// ── Schema ─────────────────────────────────────────────────────────────────

const NotificationSchema = new Schema<INotification>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, required: true, trim: true, maxlength: 100 },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    body: { type: String, required: true, trim: true, maxlength: 1000 },
    readAt: { type: Date },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
);

// ── Indexes ────────────────────────────────────────────────────────────────

// Unread notifications per user — the most common query
NotificationSchema.index({ userId: 1, readAt: 1, createdAt: -1 });
// Auto-expire notifications after 90 days
NotificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7_776_000 });

// ── Model ──────────────────────────────────────────────────────────────────

export const Notification: Model<INotification> =
  (mongoose.models['Notification'] as Model<INotification> | undefined) ??
  model<INotification>('Notification', NotificationSchema);
