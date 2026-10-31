import mongoose, { Schema, model, type Document, type Model, type Types } from 'mongoose';

export type ProfileRole = 'SEEKER' | 'PARTNER';
export type LifestyleOption = 'NEVER' | 'OCCASIONALLY' | 'REGULARLY' | 'PREFER_NOT_TO_SAY';

export interface IProfileRate {
  categoryId: Types.ObjectId;
  hourlyRatePaise: number;
}

export interface IProfile extends Document {
  userId: Types.ObjectId;
  role: ProfileRole;
  displayName: string;
  gender: string;
  dob: Date;
  city: string;
  area?: string;
  pincode?: string;
  location?: {
    type: 'Point';
    coordinates: [number, number];
  };
  bio: string;
  interests: string[];
  hobbies: string[];
  languages: string[];
  photos: string[];
  primaryPhoto?: string;

  // Partner Specific
  rates?: IProfileRate[];
  allowedSeekerGenders?: string[];
  smoke?: LifestyleOption;
  drink?: LifestyleOption;
  venuePreferences?: string[];
  isListed?: boolean;
  ratingAvg?: number;
  ratingCount?: number;

  // Seeker Specific
  preferredGenders?: string[];
  budgetPreference?: number;

  publishedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ProfileRateSchema = new Schema<IProfileRate>(
  {
    categoryId: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
    hourlyRatePaise: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const PointSchema = new Schema(
  {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], required: true },
  },
  { _id: false },
);

const ProfileSchema = new Schema<IProfile>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true, index: true },
    role: { type: String, enum: ['SEEKER', 'PARTNER'], required: true, index: true },
    displayName: { type: String, required: true, trim: true, maxlength: 100 },
    gender: { type: String, required: true },
    dob: { type: Date, required: true },
    city: { type: String, required: true, trim: true, maxlength: 100 },
    area: { type: String, trim: true, maxlength: 100 },
    pincode: { type: String, trim: true, maxlength: 10 },
    location: {
      type: PointSchema,
      default: undefined,
      required: false,
    },
    bio: { type: String, default: '', trim: true, maxlength: 2000 },
    interests: { type: [String], default: [] },
    hobbies: { type: [String], default: [] },
    languages: { type: [String], default: [] },
    photos: { type: [String], default: [] },
    primaryPhoto: { type: String },

    // Partner Attributes
    rates: { type: [ProfileRateSchema], default: [] },
    allowedSeekerGenders: { type: [String], default: [] },
    smoke: {
      type: String,
      enum: ['NEVER', 'OCCASIONALLY', 'REGULARLY', 'PREFER_NOT_TO_SAY'],
      default: 'PREFER_NOT_TO_SAY',
    },
    drink: {
      type: String,
      enum: ['NEVER', 'OCCASIONALLY', 'REGULARLY', 'PREFER_NOT_TO_SAY'],
      default: 'PREFER_NOT_TO_SAY',
    },
    venuePreferences: { type: [String], default: [] },
    isListed: { type: Boolean, default: true },
    ratingAvg: { type: Number, default: 5.0, min: 0, max: 5 },
    ratingCount: { type: Number, default: 0, min: 0 },

    // Seeker Attributes
    preferredGenders: { type: [String], default: [] },
    budgetPreference: { type: Number },

    publishedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

ProfileSchema.index({ city: 1, role: 1, isListed: 1 });
ProfileSchema.index({ location: '2dsphere' });

export const Profile: Model<IProfile> =
  (mongoose.models['Profile'] as Model<IProfile> | undefined) ??
  model<IProfile>('Profile', ProfileSchema);
