import mongoose, { Schema, model, type Document, type Model, type Types } from 'mongoose';

// ── Document interface ─────────────────────────────────────────────────────

export interface IBlock extends Document {
  userId: Types.ObjectId;
  blockedUserId: Types.ObjectId;
  createdAt: Date;
}

// ── Schema ─────────────────────────────────────────────────────────────────

const BlockSchema = new Schema<IBlock>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    blockedUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

// ── Indexes ────────────────────────────────────────────────────────────────

// Prevent duplicate blocks
BlockSchema.index({ userId: 1, blockedUserId: 1 }, { unique: true });
BlockSchema.index({ blockedUserId: 1 });

// ── Model ──────────────────────────────────────────────────────────────────

export const Block: Model<IBlock> =
  (mongoose.models['Block'] as Model<IBlock> | undefined) ?? model<IBlock>('Block', BlockSchema);
