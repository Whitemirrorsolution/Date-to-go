import mongoose, { Schema, model, type Document, type Model } from 'mongoose';

export interface IAppSetting extends Document {
  key: string;
  type: 'STRING' | 'NUMBER' | 'BOOLEAN' | 'JSON';
  value: any;
  description: string;
  isPublic: boolean;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AppSettingSchema = new Schema<IAppSetting>(
  {
    key: { type: String, required: true, unique: true, trim: true },
    type: { type: String, enum: ['STRING', 'NUMBER', 'BOOLEAN', 'JSON'], required: true },
    value: { type: Schema.Types.Mixed, required: true },
    description: { type: String, required: true },
    isPublic: { type: Boolean, default: false },
    updatedBy: { type: String }, // Admin userId
  },
  { timestamps: true }
);

export const AppSetting: Model<IAppSetting> =
  (mongoose.models['AppSetting'] as Model<IAppSetting> | undefined) ??
  model<IAppSetting>('AppSetting', AppSettingSchema);
