import { AppSetting } from '../models/AppSetting.js';
import { QuickReplyTemplate } from '../models/QuickReplyTemplate.js';
import { seedDefaultLexicon } from '../services/moderation/seedLexicon.js';
import { logger } from './logger.js';

export const ensureDeckDefaults = async (): Promise<void> => {
  const defaults = [
    { key: 'deckSkipHideDays', value: { enabled: true, days: 7 } },
    { key: 'deckPageSize', value: { enabled: true, size: 20 } },
    { key: 'signedUrlTtlMinutes', value: { enabled: true, ttl: 30 } },
    { key: 'seeker.favorites', value: { enabled: true } },
    { key: 'chat.v2', value: { enabled: true } },
    { key: 'chatGraceHours', value: { enabled: true, hours: 24 } },
    { key: 'chatMaxLength', value: { enabled: true, max: 300 } },
    { key: 'chatRatePerHour', value: { enabled: true, limit: 20 } },
    { key: 'chatRetentionDays', value: { enabled: true, days: 90 } },
  ];

  for (const def of defaults) {
    await AppSetting.updateOne({ key: def.key }, { $setOnInsert: def }, { upsert: true });
  }

  // Seed default quick reply templates (English + Hindi)
  const templates = [
    {
      key: 'GREETING_HELLO',
      textEn: 'Hello! Looking forward to our companion booking.',
      textHi: 'नमस्ते! हमारी मुलाक़ात के लिए उत्सुक हूँ।',
      phases: ['ACCEPTED', 'PAID'],
      role: 'ALL',
      order: 1,
    },
    {
      key: 'CONFIRM_VENUE',
      textEn: "I've noted the meeting venue. See you there!",
      textHi: 'मैंने मुलाक़ात की जगह नोट कर ली है। मिलते हैं!',
      phases: ['ACCEPTED', 'PAID'],
      role: 'ALL',
      order: 2,
    },
    {
      key: 'QUESTION_TIMING',
      textEn: 'Will this time slot work smoothly for you?',
      textHi: 'क्या यह समय आपके लिए सुविधाजनक रहेगा?',
      phases: ['ACCEPTED'],
      role: 'ALL',
      order: 3,
    },
    {
      key: 'LOGISTICS_ON_WAY',
      textEn: "I'm on my way to the venue.",
      textHi: 'मैं मुलाक़ात की जगह के लिए निकल चुका/चुकी हूँ।',
      phases: ['IN_PROGRESS', 'PAID'],
      role: 'ALL',
      order: 4,
    },
    {
      key: 'LOGISTICS_ARRIVED',
      textEn: "I've arrived at the venue.",
      textHi: 'मैं तय स्थान पर पहुँच चुका/चुकी हूँ।',
      phases: ['IN_PROGRESS'],
      role: 'ALL',
      order: 5,
    },
    {
      key: 'LOGISTICS_LATE_10',
      textEn: 'Running about 10 minutes late due to traffic.',
      textHi: 'ट्रैफ़िक की वजह से लगभग 10 मिनट की देरी होगी।',
      phases: ['IN_PROGRESS'],
      role: 'ALL',
      order: 6,
    },
    {
      key: 'LOGISTICS_WHERE',
      textEn: 'Where exactly are you seated inside the venue?',
      textHi: 'आप अंदर कहाँ पर बैठे हैं?',
      phases: ['IN_PROGRESS'],
      role: 'ALL',
      order: 7,
    },
  ];

  for (const tpl of templates) {
    await QuickReplyTemplate.updateOne({ key: tpl.key }, { $setOnInsert: tpl }, { upsert: true });
  }

  await seedDefaultLexicon();

  logger.info('[Init] App settings and QuickReply templates initialized');
};
