import mongoose, { Schema, model, type Document, type Model } from 'mongoose';

export type LexiconType = 'KEYWORD' | 'REGEX' | 'PHRASE';
export type LexiconLang = 'EN' | 'HI' | 'HINGLISH' | 'ALL';

export interface ILexiconEntry extends Document {
  type: LexiconType;
  pattern: string;
  lang: LexiconLang;
  weight: number;
  category: string;
  enabled: boolean;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

const LexiconEntrySchema = new Schema<ILexiconEntry>(
  {
    type: {
      type: String,
      enum: ['KEYWORD', 'REGEX', 'PHRASE'],
      required: true,
      index: true,
    },
    pattern: { type: String, required: true, trim: true },
    lang: {
      type: String,
      enum: ['EN', 'HI', 'HINGLISH', 'ALL'],
      default: 'ALL',
      required: true,
      index: true,
    },
    weight: { type: Number, required: true, default: 50 },
    category: {
      type: String,
      required: true,
      index: true,
      default: 'CONTACT_EVASION',
    },
    enabled: { type: Boolean, default: true, index: true },
    version: { type: Number, default: 1 },
  },
  {
    timestamps: true,
  }
);

LexiconEntrySchema.index({ enabled: 1, category: 1 });

export const LexiconEntry: Model<ILexiconEntry> =
  (mongoose.models['LexiconEntry'] as Model<ILexiconEntry> | undefined) ??
  model<ILexiconEntry>('LexiconEntry', LexiconEntrySchema);
