/**
 * Platform Localization Dictionary (en & hi)
 * Enforces Rule R8 i18n support.
 */

export type Language = 'en' | 'hi';

export const translations = {
  en: {
    autoRules: 'Auto-Rules',
    quickReplies: 'Quick Replies',
    newRule: 'New Rule',
    testMyRules: 'Test My Rules',
    bulkActions: 'Bulk Actions',
    verifiedSeekersOnly: 'Verified seekers only',
    leadTime: 'Lead Time',
    distance: 'Distance',
    transitBuffer: 'Transit Buffer',
    closeSelected: 'Close Selected',
    pauseSelected: 'Pause Selected',
    resumeSelected: 'Resume Selected',
    changePrice: 'Change Price',
    shiftTime: 'Shift Time',
    duplicateDates: 'Duplicate Dates',
    saveSettings: 'Save Settings',
  },
  hi: {
    autoRules: 'ऑटो-नियम',
    quickReplies: 'त्वरित उत्तर',
    newRule: 'नया नियम',
    testMyRules: 'नियम जांचें',
    bulkActions: 'एकमुश्त कार्रवाई',
    verifiedSeekersOnly: 'केवल सत्यापित साधक',
    leadTime: 'पूर्व सूचना समय',
    distance: 'दूरी',
    transitBuffer: 'यात्रा बफर',
    closeSelected: 'चयनित बंद करें',
    pauseSelected: 'चयनित रोकें',
    resumeSelected: 'चयनित पुनः चालू करें',
    changePrice: 'कीमत बदलें',
    shiftTime: 'समय बदलें',
    duplicateDates: 'तिथियों की नकल करें',
    saveSettings: 'सेटिंग्स सहेजें',
  },
};

export function t(key: keyof typeof translations['en'], lang: Language = 'en'): string {
  return translations[lang]?.[key] || translations['en'][key] || key;
}
