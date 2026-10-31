import mongoose, { Schema, model, type Document, type Model, type Types } from 'mongoose';

export type ReportStatus = 'OPEN' | 'REVIEWING' | 'ACTION_TAKEN' | 'DISMISSED' | 'RESOLVED';

export type ReportReason =
  | 'SEXUAL_SOLICITATION'       // Romantic/sexual advances
  | 'CONTACT_SHARING'           // Sharing phone/social media off-platform
  | 'PAYMENT_BYPASS'            // Attempting to pay/collect outside platform
  | 'HARASSMENT'                // Verbal, emotional, or physical
  | 'FRAUD'                     // Fake profile, impersonation, scam
  | 'INAPPROPRIATE_CONTENT'     // Bio, photos, or messages
  | 'SAFETY_CONCERN'            // Felt unsafe, threatening behaviour
  | 'NO_SHOW'                   // Partner/client didn't appear
  | 'VENUE_VIOLATION'           // Meeting in private/non-public place
  | 'UNDERAGE'                  // User appears to be under 18
  | 'DRUG_ALCOHOL'              // Alcohol/drug related incidents
  | 'OTHER';

export type ReportContext = 'PROFILE' | 'BOOKING' | 'CHAT' | 'REVIEW';

export interface IReport extends Document {
  reporterId: Types.ObjectId;
  targetUserId: Types.ObjectId;
  bookingId?: Types.ObjectId;
  messageId?: Types.ObjectId;
  context: ReportContext;
  reason: ReportReason;
  details: string;
  evidenceUrls: string[];
  autoFlagged: boolean;
  autoFlagReason?: string;
  status: ReportStatus;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  assignedTo?: Types.ObjectId;
  slaDeadline?: Date;
  resolution?: string;
  resolvedAt?: Date;
  resolvedBy?: Types.ObjectId;
  decisionLog: Array<{
    action: string;
    by: Types.ObjectId;
    at: Date;
    note?: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const ReportSchema = new Schema<IReport>(
  {
    reporterId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    targetUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    bookingId: { type: Schema.Types.ObjectId, ref: 'Booking' },
    messageId: { type: Schema.Types.ObjectId, ref: 'Message' },
    context: {
      type: String,
      enum: ['PROFILE', 'BOOKING', 'CHAT', 'REVIEW'] satisfies ReportContext[],
      required: true,
    },
    reason: {
      type: String,
      enum: [
        'SEXUAL_SOLICITATION', 'CONTACT_SHARING', 'PAYMENT_BYPASS',
        'HARASSMENT', 'FRAUD', 'INAPPROPRIATE_CONTENT', 'SAFETY_CONCERN',
        'NO_SHOW', 'VENUE_VIOLATION', 'UNDERAGE', 'DRUG_ALCOHOL', 'OTHER',
      ] satisfies ReportReason[],
      required: true,
    },
    details: { type: String, required: true, trim: true, maxlength: 3000 },
    evidenceUrls: { type: [String], default: [] },
    autoFlagged: { type: Boolean, default: false },
    autoFlagReason: { type: String },
    status: {
      type: String,
      enum: ['OPEN', 'REVIEWING', 'ACTION_TAKEN', 'DISMISSED', 'RESOLVED'] satisfies ReportStatus[],
      default: 'OPEN',
    },
    priority: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      default: 'MEDIUM',
    },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
    slaDeadline: { type: Date },
    resolution: { type: String, trim: true },
    resolvedAt: { type: Date },
    resolvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    decisionLog: [
      {
        action: { type: String, required: true },
        by: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        at: { type: Date, default: Date.now },
        note: { type: String },
      }
    ],
  },
  { timestamps: true },
);

ReportSchema.index({ status: 1, priority: -1, createdAt: -1 });
ReportSchema.index({ reporterId: 1 });
ReportSchema.index({ targetUserId: 1 });
ReportSchema.index({ slaDeadline: 1, status: 1 });

export const Report: Model<IReport> =
  (mongoose.models['Report'] as Model<IReport> | undefined) ??
  model<IReport>('Report', ReportSchema);
