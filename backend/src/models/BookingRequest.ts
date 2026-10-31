import mongoose, { Schema, model, type Document, type Model, type Types } from 'mongoose';

export type RequestStatus = 'REQUESTED' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED' | 'WITHDRAWN';

export interface IBookingRequest extends Document {
  listingId: Types.ObjectId;
  clientId: Types.ObjectId;
  partnerId: Types.ObjectId;
  message?: string;
  status: RequestStatus;
  expiresAt: Date;
  acceptedAt?: Date;
  confirmBy?: Date; // Window for the client to confirm after acceptance
  createdAt: Date;
  updatedAt: Date;
}

const BookingRequestSchema = new Schema<IBookingRequest>(
  {
    listingId: { type: Schema.Types.ObjectId, ref: 'Listing', required: true },
    clientId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    partnerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    message: { type: String, trim: true, maxlength: 1000 },
    status: {
      type: String,
      enum: ['REQUESTED', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'WITHDRAWN'],
      default: 'REQUESTED',
    },
    expiresAt: { type: Date, required: true },
    acceptedAt: { type: Date },
    confirmBy: { type: Date },
  },
  { timestamps: true }
);

// Indexes for common queries
BookingRequestSchema.index({ listingId: 1, status: 1 });
BookingRequestSchema.index({ partnerId: 1, status: 1 });
BookingRequestSchema.index({ clientId: 1, status: 1 });

// Ensure one active request per client per listing
// A client shouldn't have multiple 'REQUESTED' or 'ACCEPTED' requests for the same listing.
BookingRequestSchema.index(
  { listingId: 1, clientId: 1 },
  { unique: true, partialFilterExpression: { status: { $in: ['REQUESTED', 'ACCEPTED'] } } }
);

export const BookingRequest: Model<IBookingRequest> =
  (mongoose.models['BookingRequest'] as Model<IBookingRequest> | undefined) ??
  model<IBookingRequest>('BookingRequest', BookingRequestSchema);
