import mongoose, { Document, Model, Schema } from 'mongoose';

export interface ISupportTicket extends Document {
  userId: mongoose.Types.ObjectId;
  subject: string;
  category: 'BOOKING' | 'PAYMENT' | 'ACCOUNT' | 'SAFETY' | 'KYC' | 'OTHER';
  message: string;
  bookingId?: mongoose.Types.ObjectId;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  priority: 'LOW' | 'NORMAL' | 'HIGH';
  attachments: string[];
  messages: Array<{
    senderId: mongoose.Types.ObjectId;
    senderRole: 'USER' | 'ADMIN' | 'PARTNER';
    message: string;
    createdAt: Date;
  }>;
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const SupportTicketSchema = new Schema<ISupportTicket>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    subject: { type: String, required: true },
    category: {
      type: String,
      enum: ['BOOKING', 'PAYMENT', 'ACCOUNT', 'SAFETY', 'KYC', 'OTHER'],
      required: true,
    },
    message: { type: String, required: true },
    bookingId: { type: Schema.Types.ObjectId, ref: 'Booking' },
    status: {
      type: String,
      enum: ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'],
      default: 'OPEN',
    },
    priority: {
      type: String,
      enum: ['LOW', 'NORMAL', 'HIGH'],
      default: 'NORMAL',
    },
    attachments: [{ type: String }], // S3/Cloudinary keys
    messages: [
      {
        senderId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
        senderRole: { type: String, required: true },
        message: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    resolvedAt: { type: Date },
  },
  { timestamps: true }
);

// Pre-save to auto-escalate SAFETY tickets
SupportTicketSchema.pre('save', function (next) {
  if (this.category === 'SAFETY' && this.isNew) {
    this.priority = 'HIGH';
  }
  next();
});

export const SupportTicket: Model<ISupportTicket> = mongoose.model<ISupportTicket>('SupportTicket', SupportTicketSchema);
