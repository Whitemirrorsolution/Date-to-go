import mongoose, { Schema, model, type Document, type Model } from 'mongoose';

export interface IServicePackage extends Document {
  title: string;
  description: string;
  pricePaise: number;
  durationHours: number;
  categoryId: mongoose.Types.ObjectId;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ServicePackageSchema = new Schema<IServicePackage>(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    pricePaise: { type: Number, required: true },
    durationHours: { type: Number, required: true },
    categoryId: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export const ServicePackage: Model<IServicePackage> =
  (mongoose.models['ServicePackage'] as Model<IServicePackage> | undefined) ??
  model<IServicePackage>('ServicePackage', ServicePackageSchema);
