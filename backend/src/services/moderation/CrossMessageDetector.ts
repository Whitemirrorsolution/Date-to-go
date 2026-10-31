/**
 * CrossMessageDetector — Layer 4 of Anti-Circumvention Pipeline.
 * Detects split phone numbers and obfuscated contact exchanges distributed across
 * multiple consecutive messages sent by the same user within a short time window.
 */

import { Message } from '../../models/Message.js';
import { Normalizer } from './Normalizer.js';
import { AllowlistFilter } from './AllowlistFilter.js';

export interface CrossMessageCheckResult {
  isEvasion: boolean;
  ruleId?: string | undefined;
  reason?: string | undefined;
  combinedExcerpt?: string | undefined;
}

export class CrossMessageDetector {
  /**
   * Pure evaluation function accepting historical texts and incoming text.
   * Useful for unit testing and direct invocation.
   */
  public static evaluateTexts(
    recentTexts: string[],
    newText: string
  ): CrossMessageCheckResult {
    if (!newText || recentTexts.length === 0) {
      return { isEvasion: false };
    }

    // Combine recent texts + new text
    const allTexts = [...recentTexts, newText];

    // Extract digits after allowlisting each individual message
    const digitSequences: string[] = [];

    for (const txt of allTexts) {
      const norm = Normalizer.normalize(txt);
      const { maskedText } = AllowlistFilter.maskAllowlistedPatterns(norm.forContactScan);
      const digits = maskedText.replace(/\D/g, '');
      if (digits.length > 0) {
        digitSequences.push(digits);
      }
    }

    const combinedDigits = digitSequences.join('');

    // If combined digits reach 8 or more, and the new message contributed digits
    const newNorm = Normalizer.normalize(newText);
    const { maskedText: newMasked } = AllowlistFilter.maskAllowlistedPatterns(newNorm.forContactScan);
    const newDigits = newMasked.replace(/\D/g, '');

    if (combinedDigits.length >= 8 && newDigits.length >= 2 && recentTexts.length > 0) {
      // Check if combined digits form an Indian mobile pattern or a single contiguous number split
      const indianMobileRegex = /(?:\+?91)?[6-9]\d{9}/;
      const isMobileMatch = indianMobileRegex.test(combinedDigits) || combinedDigits.length >= 10;

      if (isMobileMatch || combinedDigits.length >= 8) {
        return {
          isEvasion: true,
          ruleId: 'RULE_CROSS_MESSAGE_PHONE_SPLIT',
          reason: `Detected phone number split across consecutive messages (${combinedDigits.length} digits total)`,
          combinedExcerpt: combinedDigits.slice(0, 10),
        };
      }
    }

    return { isEvasion: false };
  }

  /**
   * Database-backed evaluation fetching sender's last 3 messages in the last 10 minutes.
   */
  public static async checkSenderRecent(
    bookingId: string,
    senderId: string,
    newText: string
  ): Promise<CrossMessageCheckResult> {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

    const recentDocs = await Message.find({
      bookingId,
      senderId,
      createdAt: { $gte: tenMinutesAgo },
    })
      .sort({ createdAt: -1 })
      .limit(3)
      .lean();

    // Reverse to chronological order
    const historicalTexts = recentDocs.reverse().map((m) => m.text);

    return this.evaluateTexts(historicalTexts, newText);
  }
}
