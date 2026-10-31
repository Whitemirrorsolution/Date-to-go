/**
 * seedLexicon — Seeds initial bilingual English, Hindi, and Hinglish anti-circumvention entries.
 */

import { LexiconEntry } from '../../models/LexiconEntry.js';
import { logger } from '../../utils/logger.js';

export const INITIAL_LEXICON_ENTRIES = [
  // Contact & Handles
  { type: 'KEYWORD', pattern: 'whatsapp', lang: 'ALL', weight: 80, category: 'CONTACT_EVASION' },
  { type: 'KEYWORD', pattern: 'telegram', lang: 'ALL', weight: 80, category: 'CONTACT_EVASION' },
  { type: 'KEYWORD', pattern: 'instagram', lang: 'ALL', weight: 80, category: 'CONTACT_EVASION' },
  { type: 'KEYWORD', pattern: 'snapchat', lang: 'ALL', weight: 80, category: 'CONTACT_EVASION' },
  { type: 'KEYWORD', pattern: 'insta', lang: 'ALL', weight: 70, category: 'CONTACT_EVASION' },
  { type: 'PHRASE', pattern: 'dm me', lang: 'EN', weight: 60, category: 'CONTACT_EVASION' },
  { type: 'PHRASE', pattern: 'ping me', lang: 'EN', weight: 60, category: 'CONTACT_EVASION' },
  { type: 'PHRASE', pattern: 'call me', lang: 'EN', weight: 60, category: 'CONTACT_EVASION' },
  { type: 'PHRASE', pattern: 'text me', lang: 'EN', weight: 60, category: 'CONTACT_EVASION' },
  { type: 'PHRASE', pattern: 'apna number', lang: 'HINGLISH', weight: 80, category: 'CONTACT_EVASION' },
  { type: 'PHRASE', pattern: 'number bhejo', lang: 'HINGLISH', weight: 80, category: 'CONTACT_EVASION' },
  { type: 'PHRASE', pattern: 'number do', lang: 'HINGLISH', weight: 80, category: 'CONTACT_EVASION' },
  { type: 'PHRASE', pattern: 'insta pe aao', lang: 'HINGLISH', weight: 85, category: 'CONTACT_EVASION' },
  { type: 'PHRASE', pattern: 'wa pe aao', lang: 'HINGLISH', weight: 85, category: 'CONTACT_EVASION' },

  // Payment Circumvention & Off-platform
  { type: 'PHRASE', pattern: 'bahar milte', lang: 'HINGLISH', weight: 85, category: 'PAYMENT_CIRCUMVENTION' },
  { type: 'PHRASE', pattern: 'bahar milo', lang: 'HINGLISH', weight: 85, category: 'PAYMENT_CIRCUMVENTION' },
  { type: 'PHRASE', pattern: 'cash me', lang: 'HINGLISH', weight: 80, category: 'PAYMENT_CIRCUMVENTION' },
  { type: 'PHRASE', pattern: 'cash denge', lang: 'HINGLISH', weight: 80, category: 'PAYMENT_CIRCUMVENTION' },
  { type: 'PHRASE', pattern: 'direct cash', lang: 'EN', weight: 80, category: 'PAYMENT_CIRCUMVENTION' },
  { type: 'PHRASE', pattern: 'direct pay', lang: 'EN', weight: 80, category: 'PAYMENT_CIRCUMVENTION' },
  { type: 'PHRASE', pattern: 'direct gpay', lang: 'EN', weight: 85, category: 'PAYMENT_CIRCUMVENTION' },
  { type: 'PHRASE', pattern: 'advance pay', lang: 'EN', weight: 70, category: 'PAYMENT_CIRCUMVENTION' },
  { type: 'PHRASE', pattern: 'pay outside', lang: 'EN', weight: 85, category: 'PAYMENT_CIRCUMVENTION' },

  // 100% Platonic Code of Conduct
  { type: 'KEYWORD', pattern: 'escort', lang: 'ALL', weight: 100, category: 'ESCORT_SOLICITATION' },
  { type: 'KEYWORD', pattern: 'callgirl', lang: 'ALL', weight: 100, category: 'ESCORT_SOLICITATION' },
  { type: 'KEYWORD', pattern: 'gigolo', lang: 'ALL', weight: 100, category: 'ESCORT_SOLICITATION' },
  { type: 'KEYWORD', pattern: 'hookup', lang: 'ALL', weight: 90, category: 'ESCORT_SOLICITATION' },
  { type: 'PHRASE', pattern: 'massage parlor', lang: 'EN', weight: 100, category: 'ESCORT_SOLICITATION' },
  { type: 'PHRASE', pattern: 'happy ending', lang: 'EN', weight: 100, category: 'ESCORT_SOLICITATION' },
  { type: 'PHRASE', pattern: 'paid sex', lang: 'EN', weight: 100, category: 'ESCORT_SOLICITATION' },
] as const;

export async function seedDefaultLexicon(): Promise<number> {
  let seededCount = 0;
  for (const item of INITIAL_LEXICON_ENTRIES) {
    const existing = await LexiconEntry.findOne({ pattern: item.pattern, category: item.category });
    if (!existing) {
      await LexiconEntry.create({
        type: item.type,
        pattern: item.pattern,
        lang: item.lang,
        weight: item.weight,
        category: item.category,
        enabled: true,
        version: 1,
      });
      seededCount++;
    }
  }

  if (seededCount > 0) {
    logger.info({ seededCount }, 'Seeded default anti-circumvention lexicon rules');
  }

  return seededCount;
}
