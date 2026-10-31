import mongoose, { Schema, model, type Document, type Model, type Types } from 'mongoose';

// ── Enums ──────────────────────────────────────────────────────────────────

export type OtpType = 'EMAIL_VERIFY' | 'PHONE_VERIFY' | 'PASSWORD_RESET' | 'LOGIN_OTP' | 'REGISTER_OTP';

// ── Document interface ─────────────────────────────────────────────────────

export interface IOtp extends Document {
  userId: Types.ObjectId;
  type: OtpType;
  /** E.164 phone or lowercased email — the delivery target */
  target: string;
  /** bcrypt/argon2 hash of the 6-digit OTP */
  otpHash: string;
  expiresAt: Date;
  /** How many verification attempts have been made against this OTP */
  attempts: number;
  createdAt: Date;
}

// ── Schema ─────────────────────────────────────────────────────────────────

const OtpSchema = new Schema<IOtp>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      enum: ['EMAIL_VERIFY', 'PHONE_VERIFY', 'PASSWORD_RESET', 'LOGIN_OTP', 'REGISTER_OTP'] satisfies OtpType[],
      required: true,
    },
    target: { type: String, required: true, trim: true, lowercase: true },
    otpHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    attempts: { type: Number, default: 0, min: 0 },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
);

// ── Indexes ────────────────────────────────────────────────────────────────

// One active OTP per user per type (upsert pattern in service)
OtpSchema.index({ userId: 1, type: 1 });
// Ensure only one OTP per target (phone/email) and type
OtpSchema.index({ target: 1, type: 1 }, { unique: true });
// Auto-expire OTP documents after expiresAt
OtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// ── Model ──────────────────────────────────────────────────────────────────

export const Otp: Model<IOtp> =
  (mongoose.models['Otp'] as Model<IOtp> | undefined) ?? model<IOtp>('Otp', OtpSchema);
