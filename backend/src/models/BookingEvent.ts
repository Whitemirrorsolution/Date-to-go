import mongoose, { Schema, model, type Document, type Model, type Types } from 'mongoose';
import { type BookingStatus } from './Booking.js';

export interface IBookingEvent extends Document {
  bookingId: Types.ObjectId;
  status: BookingStatus;
  actorId: Types.ObjectId;
  actorModel: 'User' | 'Admin'; // Admin can also force changes
  reason?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

const BookingEventSchema = new Schema<IBookingEvent>(
  {
    bookingId: { type: Schema.Types.ObjectId, ref: 'Booking', required: true },
    status: { type: String, required: true },
    actorId: { type: Schema.Types.ObjectId, required: true, refPath: 'actorModel' },
    actorModel: { type: String, required: true, enum: ['User', 'Admin'] },
    reason: { type: String, maxlength: 500 },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

BookingEventSchema.index({ bookingId: 1, createdAt: -1 });

export const BookingEvent: Model<IBookingEvent> =
  (mongoose.models['BookingEvent'] as Model<IBookingEvent> | undefined) ??
  model<IBookingEvent>('BookingEvent', BookingEventSchema);
