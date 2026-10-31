import mongoose, { Document, Model, Schema } from 'mongoose';

export interface IFaqItem extends Document {
  question: string;
  answer: any[]; // block schema
  topic: string;
  order: number;
  isPopular: boolean;
  isActive: boolean;
}

const FaqItemSchema = new Schema<IFaqItem>(
  {
    question: { type: String, required: true },
    answer: { type: Schema.Types.Mixed, default: [] },
    topic: { type: String, required: true },
    order: { type: Number, default: 0 },
    isPopular: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

FaqItemSchema.index({ question: 'text' });

export const FaqItem: Model<IFaqItem> = mongoose.model<IFaqItem>('FaqItem', FaqItemSchema);
