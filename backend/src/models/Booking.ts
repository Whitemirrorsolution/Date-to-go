import mongoose, { Schema, model, type Document, type Model, type Types } from 'mongoose';

export type BookingStage =
  | 'REQUESTED'
  | 'ACCEPTED'
  | 'PAYMENT_PENDING'
  | 'PAID'
  | 'IN_PROGRESS'
  | 'AWAITING_OTP'
  | 'COMPLETED'
  | 'DECLINED'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'DISPUTED'
  | 'REFUNDED';

export type BookingStatus = BookingStage;

export interface IBooking extends Document {
  requestId: Types.ObjectId;
  listingId: Types.ObjectId;
  clientId: Types.ObjectId;
  partnerId: Types.ObjectId;
  categoryId: Types.ObjectId;

  // Snapshotted from Listing
  startAt: Date;
  endAt: Date;
  durationMins: number;
  venueName: string;
  venueAddress: string;

  // Money / Pricing Snapshot
  basePaise: number;
  userGstPaise: number;
  totalPaise: number;
  commissionPaise: number;
  commissionGstPaise: number;
  partnerNetPaise: number;
  commissionRuleConfig?: any;

  // State
  stage: BookingStage;

  // Escrow / OTP
  otpHash?: string;
  otpExpiresAt?: Date;
  otpAttempts: number;
  otpLockoutUntil?: Date;
  startPin?: string;
  completionPin?: string;
  completionOtpHash?: string;
  completionOtpAttempts?: number;
  completionOtpLockoutUntil?: Date;
  partnerTravelStatus?: 'STATIONARY' | 'ON_THE_WAY' | 'ARRIVED';
  actualStartAt?: Date;
  actualEndAt?: Date;

  cancelReason?: string;

  createdAt: Date;
  updatedAt: Date;
}

const BookingSchema = new Schema<IBooking>(
  {
    requestId: { type: Schema.Types.ObjectId, ref: 'BookingRequest', required: true, unique: true },
    listingId: { type: Schema.Types.ObjectId, ref: 'Listing', required: true },
    clientId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    partnerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    categoryId: { type: Schema.Types.ObjectId, ref: 'Category', required: true },

    startAt: { type: Date, required: true },
    endAt: { type: Date, required: true },
    durationMins: { type: Number, required: true },
    venueName: { type: String, required: true },
    venueAddress: { type: String, required: true },

    basePaise: { type: Number, required: true },
    userGstPaise: { type: Number, required: true },
    totalPaise: { type: Number, required: true },
    commissionPaise: { type: Number, required: true },
    commissionGstPaise: { type: Number, required: true },
    partnerNetPaise: { type: Number, required: true },
    commissionRuleConfig: { type: Schema.Types.Mixed },

    stage: {
      type: String,
      enum: [
        'REQUESTED', 'ACCEPTED', 'PAYMENT_PENDING', 'PAID', 'IN_PROGRESS',
        'AWAITING_OTP', 'COMPLETED', 'DECLINED', 'CANCELLED', 'EXPIRED',
        'DISPUTED', 'REFUNDED'
      ],
      required: true,
      default: 'PAYMENT_PENDING',
    },

    otpHash: { type: String },
    otpExpiresAt: { type: Date },
    otpAttempts: { type: Number, default: 0 },
    otpLockoutUntil: { type: Date },
    startPin: { type: String },
    completionPin: { type: String },
    completionOtpHash: { type: String },
    completionOtpAttempts: { type: Number, default: 0 },
    completionOtpLockoutUntil: { type: Date },
    partnerTravelStatus: {
      type: String,
      enum: ['STATIONARY', 'ON_THE_WAY', 'ARRIVED'],
      default: 'STATIONARY',
    },
    actualStartAt: { type: Date },
    actualEndAt: { type: Date },

    cancelReason: { type: String },
  },
  { timestamps: true },
);

// Indexes
BookingSchema.index({ clientId: 1, stage: 1 });
BookingSchema.index({ partnerId: 1, stage: 1 });
BookingSchema.index({ listingId: 1 });
BookingSchema.index({ startAt: 1, stage: 1 });

export const Booking: Model<IBooking> =
  (mongoose.models['Booking'] as Model<IBooking> | undefined) ??
  model<IBooking>('Booking', BookingSchema);
