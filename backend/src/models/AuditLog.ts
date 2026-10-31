import mongoose, { Schema, model, type Document, type Model, type Types } from 'mongoose';

// ── Document interface ─────────────────────────────────────────────────────

export interface IAuditLog extends Document {
  actorId: Types.ObjectId;
  action: string;
  entityType: string;
  entityId?: Types.ObjectId;
  meta?: Record<string, unknown>;
  ip?: string;
  createdAt: Date;
}

// ── Schema ─────────────────────────────────────────────────────────────────

const AuditLogSchema = new Schema<IAuditLog>(
  {
    actorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    action: { type: String, required: true, trim: true, maxlength: 100 },
    entityType: { type: String, required: true, trim: true, maxlength: 100 },
    entityId: { type: Schema.Types.ObjectId },
    meta: { type: Schema.Types.Mixed },
    ip: { type: String, trim: true, maxlength: 45 }, // supports IPv6
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
);

// ── Indexes ────────────────────────────────────────────────────────────────

AuditLogSchema.index({ actorId: 1, createdAt: -1 });
AuditLogSchema.index({ entityType: 1, entityId: 1, createdAt: -1 });
AuditLogSchema.index({ action: 1 });
// Auto-expire audit logs after 2 years (optional; remove if long-term retention needed)
// AuditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 63_072_000 });

// ── Model ──────────────────────────────────────────────────────────────────

export const AuditLog: Model<IAuditLog> =
  (mongoose.models['AuditLog'] as Model<IAuditLog> | undefined) ??
  model<IAuditLog>('AuditLog', AuditLogSchema);
