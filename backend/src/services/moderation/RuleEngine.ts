/**
 * RuleEngine — Layer 3 of Anti-Circumvention Pipeline.
 * Evaluates normalized and allowlist-filtered content against:
 * 1. Phone number and digit sequence extraction (>= 8 digits)
 * 2. UPI payment handles & off-platform payment bypass
 * 3. Email addresses and external URLs/shortlinks
 * 4. Social media handles and off-platform redirect keywords
 * 5. Off-platform steering phrases in English, Hindi, and Hinglish
 * 6. 100% Platonic Code of Conduct (escort/sexual solicitation)
 * 7. Dynamic Lexicon weights
 */

import mongoose from 'mongoose';
import { LexiconEntry, type ILexiconEntry } from '../../models/LexiconEntry.js';
import { Normalizer } from './Normalizer.js';
import { AllowlistFilter } from './AllowlistFilter.js';

export interface RuleEvaluationResult {
  decision: 'ALLOW' | 'ALLOW_AND_FLAG' | 'BLOCK';
  score: number;
  ruleIds: string[];
  reasons: string[];
  userNotice?: string | undefined;
}

// Built-in rule definitions with default weights
export const RULES = {
  PHONE: {
    id: 'RULE_PHONE_DIGIT_SEQUENCE',
    weight: 100,
    notice: 'Phone numbers and personal contact details cannot be exchanged before meeting.',
  },
  EMAIL: {
    id: 'RULE_EMAIL_ADDRESS',
    weight: 100,
    notice: 'Email addresses cannot be shared in booking chat for safety and privacy reasons.',
  },
  URL: {
    id: 'RULE_EXTERNAL_URL',
    weight: 90,
    notice: 'External links and website URLs are not permitted in chat.',
  },
  UPI: {
    id: 'RULE_UPI_HANDLE',
    weight: 100,
    notice: 'Direct off-platform payment handles (UPI / GPay / Paytm) are strictly prohibited. All payments must stay in escrow.',
  },
  SOCIAL_HANDLE: {
    id: 'RULE_SOCIAL_HANDLE',
    weight: 85,
    notice: 'Social media handles and off-platform messaging links cannot be shared.',
  },
  OFFPLATFORM_PHRASE: {
    id: 'RULE_OFFPLATFORM_PHRASE',
    weight: 85,
    notice: 'Attempts to redirect communication or payment outside Date to Go violate platform safety guidelines.',
  },
  ADULT_SOLICITATION: {
    id: 'RULE_ADULT_SOLICITATION',
    weight: 100,
    notice: 'Solicitation or adult content is strictly prohibited. Date to Go is 100% platonic.',
  },
  SUSPICIOUS_KEYWORD: {
    id: 'RULE_SUSPICIOUS_KEYWORD',
    weight: 35,
    notice: 'Message flagged for review due to policy keywords.',
  },
};

export class RuleEngine {
  // UPI handle pattern
  private static readonly UPI_PATTERN =
    /\b[a-zA-Z0-9.\-_]{2,}@(okhdfcbank|okaxis|oksbi|okicici|paytm|ybl|ibl|axl|upi|apl|barodampay|federal|postbank|kotak|indus)\b/i;

  // Email pattern
  private static readonly EMAIL_PATTERN =
    /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,7}\b/i;

  // External URLs & shortlinks
  private static readonly URL_PATTERN =
    /(?:https?:\/\/|www\.)[^\s]+|\b(?:wa\.me|t\.me|bit\.ly|tinyurl\.com|linktr\.ee)\/[^\s]+|\b[a-zA-Z0-9-]+\.(?:com|in|org|net|io|me|app)\b/i;

  // Social handles pattern e.g. @username (ignoring email domains)
  private static readonly SOCIAL_HANDLE_PATTERN =
    /(?:^|\s)@([a-zA-Z0-9_]{3,30})\b/i;

  // Adult / escort terms
  private static readonly ADULT_PATTERNS: RegExp[] = [
    /\b(escort|escorts|callgirl|call\s*girl|gigolo|hookup|hook\s*up)\b/i,
    /\b(massage\s*parlor|happy\s*ending|erotic|sensual\s*massage|body\s*rub)\b/i,
    /\b(paid\s*sex|sex\s*work|sexual\s*service|adult\s*service|physical\s*intimacy)\b/i,
    /\b(one\s*night\s*stand|casual\s*encounter|friends\s*with\s*benefits|fwb)\b/i,
    /\b(nude|nudes|nsfw|sex|intercourse|prostitution|brothel)\b/i,
  ];

  // Off-platform steering phrases in English, Hindi, Hinglish
  private static readonly OFFPLATFORM_PHRASES: RegExp[] = [
    // English steering
    /\b(call\s*me\s*at|call\s*me\s*on|dm\s*me|message\s*me\s*on|msg\s*me\s*on|ping\s*me\s*on|whatsapp\s*me|reach\s*me\s*on|text\s*me\s*on)\b/i,
    /\b(share\s*(?:your\s*)?contact|share\s*(?:your\s*)?number|exchange\s*contacts?|personal\s*number)\b/i,
    /\b(pay\s*outside|direct\s*pay(?:ment)?|advance\s*pay(?:ment)?|cash\s*on\s*meet)\b/i,

    // Hindi & Hinglish steering
    /\b(bahar\s*milte|bahar\s*milo|bahar\s*chalte|bahar\s*aao|bahar\s*baat|direct\s*mil(?:o|enge|te)?|direct\s*deal)\b/i,
    /\b(cash\s*me\s*(?:denge|dunga|kar(?:o|te)?)|direct\s*cash|cash\s*payment\s*karenge)\b/i,
    /\b(apna\s*number\s*(?:do|de|bhejo|share\s*karo)|number\s*(?:do|de\s*na|bhejo)|contact\s*share\s*karo)\b/i,
    /\b(insta\s*pe\s*aao|ig\s*pe\s*aao|telegram\s*pe\s*aao|wa\s*pe\s*aao|whatsapp\s*pe\s*aao)\b/i,
    /\b(bina\s*app\s*ke|platform\s*ke\s*bahar|direct\s*gpay|direct\s*phonepe)\b/i,
  ];

  /**
   * Run full evaluation on a single text string.
   */
  public static async evaluate(
    text: string,
    options?: { customLexicon?: ILexiconEntry[] | undefined }
  ): Promise<RuleEvaluationResult> {
    if (!text || text.trim().length === 0) {
      return {
        decision: 'ALLOW',
        score: 0,
        ruleIds: [],
        reasons: [],
      };
    }

    const ruleIds: string[] = [];
    const reasons: string[] = [];
    let score = 0;
    let primaryNotice: string | undefined = undefined;

    // 1. Layer 1: Normalization
    const norm = Normalizer.normalize(text);

    // 2. Layer 2: Allowlisting (mask legitimate times, prices, durations, venues, etc.)
    const { maskedText } = AllowlistFilter.maskAllowlistedPatterns(norm.forContactScan);

    // 3. Layer 3: Rule checks

    // A. Check UPI handle
    if (this.UPI_PATTERN.test(norm.cleaned) || this.UPI_PATTERN.test(norm.forKeywordScan)) {
      score += RULES.UPI.weight;
      ruleIds.push(RULES.UPI.id);
      reasons.push('UPI handle detected');
      primaryNotice = primaryNotice ?? RULES.UPI.notice;
    }

    // B. Check Email address
    if (this.EMAIL_PATTERN.test(norm.cleaned)) {
      score += RULES.EMAIL.weight;
      ruleIds.push(RULES.EMAIL.id);
      reasons.push('Email address detected');
      primaryNotice = primaryNotice ?? RULES.EMAIL.notice;
    }

    // C. Check External URL / Shortlinks
    if (this.URL_PATTERN.test(norm.cleaned)) {
      score += RULES.URL.weight;
      ruleIds.push(RULES.URL.id);
      reasons.push('External link or domain detected');
      primaryNotice = primaryNotice ?? RULES.URL.notice;
    }

    // D. Check Phone number / Digit sequences (>= 8 digits) in allowlisted text
    // Remove all non-digits from the allowlist-masked text
    const remainingDigits = maskedText.replace(/\D/g, '');
    const containsEightOrMoreDigits = remainingDigits.length >= 8;

    // Also test standard Indian mobile regex in normalized text
    const indianMobileRegex = /(?:\+?91[\s-]?)?[6-9]\d{9}\b/;
    const matchesIndianMobile = indianMobileRegex.test(norm.forContactScan);

    if (containsEightOrMoreDigits || matchesIndianMobile) {
      score += RULES.PHONE.weight;
      ruleIds.push(RULES.PHONE.id);
      reasons.push('Phone number or digit sequence (>=8 digits) detected');
      primaryNotice = primaryNotice ?? RULES.PHONE.notice;
    }

    // E. Check Social media handles
    if (this.SOCIAL_HANDLE_PATTERN.test(norm.cleaned) && !this.UPI_PATTERN.test(norm.cleaned) && !this.EMAIL_PATTERN.test(norm.cleaned)) {
      score += RULES.SOCIAL_HANDLE.weight;
      ruleIds.push(RULES.SOCIAL_HANDLE.id);
      reasons.push('Social media handle detected');
      primaryNotice = primaryNotice ?? RULES.SOCIAL_HANDLE.notice;
    }

    // F. Check Adult / Escort solicitation
    for (const pattern of this.ADULT_PATTERNS) {
      if (pattern.test(norm.cleaned) || pattern.test(norm.forKeywordScan)) {
        score += RULES.ADULT_SOLICITATION.weight;
        ruleIds.push(RULES.ADULT_SOLICITATION.id);
        reasons.push('Adult/escort solicitation detected');
        primaryNotice = primaryNotice ?? RULES.ADULT_SOLICITATION.notice;
        break;
      }
    }

    // G. Check Off-platform steering phrases (English & Hinglish)
    for (const phraseRegex of this.OFFPLATFORM_PHRASES) {
      if (phraseRegex.test(norm.cleaned) || phraseRegex.test(norm.forKeywordScan)) {
        score += RULES.OFFPLATFORM_PHRASE.weight;
        ruleIds.push(RULES.OFFPLATFORM_PHRASE.id);
        reasons.push('Off-platform steering phrase detected');
        primaryNotice = primaryNotice ?? RULES.OFFPLATFORM_PHRASE.notice;
        break;
      }
    }

    // H. Dynamic Lexicon Check (from DB or provided cache)
    try {
      const lexiconList =
        options?.customLexicon ??
        (mongoose.connection.readyState === 1
          ? await LexiconEntry.find({ enabled: true }).lean().catch(() => [])
          : []);

      for (const entry of lexiconList) {
        let matched = false;
        if (entry.type === 'KEYWORD') {
          const kwRegex = new RegExp(`\\b${entry.pattern}\\b`, 'i');
          matched = kwRegex.test(norm.forKeywordScan) || kwRegex.test(norm.cleaned);
        } else if (entry.type === 'PHRASE') {
          matched = norm.forKeywordScan.includes(entry.pattern.toLowerCase()) ||
                    norm.cleaned.toLowerCase().includes(entry.pattern.toLowerCase());
        } else if (entry.type === 'REGEX') {
          try {
            const rx = new RegExp(entry.pattern, 'i');
            matched = rx.test(norm.cleaned) || rx.test(norm.forKeywordScan);
          } catch {
            // ignore invalid regex in lexicon entry
          }
        }

        if (matched) {
          score += entry.weight;
          ruleIds.push(`LEXICON_${entry.category}_${entry._id ? entry._id.toString() : 'CUSTOM'}`);
          reasons.push(`Matched lexicon keyword: ${entry.pattern}`);
        }
      }
    } catch {
      // Continue safely if lexicon DB read fails
    }

    // Determine final decision
    let decision: 'ALLOW' | 'ALLOW_AND_FLAG' | 'BLOCK' = 'ALLOW';
    if (score >= 80) {
      decision = 'BLOCK';
    } else if (score >= 40) {
      decision = 'ALLOW_AND_FLAG';
    }

    return {
      decision,
      score,
      ruleIds: Array.from(new Set(ruleIds)),
      reasons: Array.from(new Set(reasons)),
      userNotice: primaryNotice,
    };
  }
}
