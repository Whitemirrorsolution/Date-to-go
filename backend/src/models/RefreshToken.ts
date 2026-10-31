import mongoose, { Schema, model, type Document, type Model, type Types } from 'mongoose';

// ── Document interface ─────────────────────────────────────────────────────

export interface IRefreshToken extends Document {
  userId: Types.ObjectId;
  /** SHA-256 hash of the opaque token UUID */
  tokenHash: string;
  /** Family ID — all tokens from the same refresh chain share this */
  family: string;
  expiresAt: Date;
  revoked: boolean;
  createdAt: Date;
}

// ── Schema ─────────────────────────────────────────────────────────────────

const RefreshTokenSchema = new Schema<IRefreshToken>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    tokenHash: { type: String, required: true, unique: true },
    family: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    revoked: { type: Boolean, default: false },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
);

// ── Indexes ────────────────────────────────────────────────────────────────

// tokenHash unique index already created via `unique: true` in field definition
RefreshTokenSchema.index({ userId: 1, revoked: 1 });
RefreshTokenSchema.index({ family: 1 });
// Auto-expire documents after they are no longer valid
RefreshTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// ── Model ──────────────────────────────────────────────────────────────────

export const RefreshToken: Model<IRefreshToken> =
  (mongoose.models['RefreshToken'] as Model<IRefreshToken> | undefined) ??
  model<IRefreshToken>('RefreshToken', RefreshTokenSchema);
