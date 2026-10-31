import mongoose, { Document, Model, Schema } from 'mongoose';

export interface ICompanySettings extends Document {
  legalName: string;
  brandName: string;
  cin?: string;
  gstin?: string;
  registeredAddress?: string;
  website?: string;
  supportPhone?: string;
  supportEmail?: string;
  supportHours?: string;
  grievanceOfficer: {
    name: string;
    email: string;
    phone?: string;
  };
  dpoEmail?: string;
  privacyEmail?: string;
  safetyEmail?: string;
  conductEmail?: string;
  emergencyContacts: Array<{
    label: string;
    number: string;
    tone: 'danger' | 'pink' | 'info';
  }>;
  reportSlaHours: number;
  grievanceAckHours: number;
  grievanceResolveDays: number;
  updatedAt: Date;
}

const CompanySettingsSchema = new Schema<ICompanySettings>(
  {
    legalName: { type: String, default: 'Date to Go Experiences Pvt Ltd' },
    brandName: { type: String, default: 'Date to Go' },
    cin: { type: String },
    gstin: { type: String },
    registeredAddress: { type: String },
    website: { type: String },
    supportPhone: { type: String },
    supportEmail: { type: String },
    supportHours: { type: String },
    grievanceOfficer: {
      name: { type: String, default: 'Grievance Officer' },
      email: { type: String, default: 'grievance@datetogo.in' },
      phone: { type: String },
    },
    dpoEmail: { type: String },
    privacyEmail: { type: String },
    safetyEmail: { type: String },
    conductEmail: { type: String },
    emergencyContacts: [
      {
        label: { type: String, required: true },
        number: { type: String, required: true },
        tone: { type: String, enum: ['danger', 'pink', 'info'], required: true },
      },
    ],
    reportSlaHours: { type: Number, default: 24 },
    grievanceAckHours: { type: Number, default: 24 },
    grievanceResolveDays: { type: Number, default: 15 },
  },
  { timestamps: true }
);

export const CompanySettings: Model<ICompanySettings> = mongoose.model<ICompanySettings>('CompanySettings', CompanySettingsSchema);
