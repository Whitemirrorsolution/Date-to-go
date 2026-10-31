import mongoose, { Schema, model, type Document, type Model, type Types } from 'mongoose';

export type ListingStatus = 'DRAFT' | 'OPEN' | 'HELD' | 'BOOKED' | 'CLOSED' | 'EXPIRED' | 'CANCELLED' | 'ACTIVE' | 'PAUSED';

export type VenueType = 'CAFE' | 'MALL' | 'CINEMA' | 'RESTAURANT' | 'PARK' | 'EVENT_VENUE' | 'HOSPITAL' | 'MARKET' | 'OTHER_PUBLIC' | 'CLIENT_HOME';

export interface IListing extends Document {
  partnerId: Types.ObjectId;
  categoryId: Types.ObjectId;
  title?: string;
  description?: string;
  startAt: Date;
  endAt: Date;
  durationMins: number;
  city: string;
  area: string;
  pincode: string;
  locationPoint?: { type: 'Point'; coordinates: [number, number] };
  venueType: VenueType;
  venueName: string;
  venueAddress: string; // Hidden until payment
  basePricePaise: number;
  status: ListingStatus;
  createdAt: Date;
  updatedAt: Date;
}

const PointSchema = new Schema(
  {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true },
  },
  { _id: false },
);

const ListingSchema = new Schema<IListing>(
  {
    partnerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    categoryId: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
    title: { type: String, trim: true, maxlength: 100 },
    description: { type: String, trim: true, maxlength: 1000 },
    startAt: { type: Date, required: true },
    endAt: { type: Date, required: true },
    durationMins: { type: Number, required: true },
    city: { type: String, required: true, trim: true },
    area: { type: String, required: true, trim: true },
    pincode: { type: String, required: true, trim: true },
    locationPoint: {
      type: PointSchema,
      default: undefined,
      required: false,
    },
    venueType: {
      type: String,
      enum: ['CAFE', 'MALL', 'CINEMA', 'RESTAURANT', 'PARK', 'EVENT_VENUE', 'HOSPITAL', 'MARKET', 'OTHER_PUBLIC', 'CLIENT_HOME'],
      required: true,
    },
    venueName: { type: String, required: true, trim: true },
    venueAddress: { type: String, required: true, trim: true },
    basePricePaise: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ['DRAFT', 'OPEN', 'HELD', 'BOOKED', 'CLOSED', 'EXPIRED', 'CANCELLED', 'ACTIVE', 'PAUSED'],
      default: 'OPEN',
    },
  },
  { timestamps: true }
);

// Performance & Query Indexes
ListingSchema.index({ partnerId: 1, status: 1 });
ListingSchema.index({ categoryId: 1, status: 1 });
ListingSchema.index({ startAt: 1, status: 1 });
ListingSchema.index({ locationPoint: '2dsphere' });

// Overlap prevention index logic usually requires application-side checking or constraints,
// but indexing on startAt/endAt helps with range queries.
ListingSchema.index({ partnerId: 1, startAt: 1, endAt: 1 });

export const Listing: Model<IListing> =
  (mongoose.models['Listing'] as Model<IListing> | undefined) ??
  model<IListing>('Listing', ListingSchema);
