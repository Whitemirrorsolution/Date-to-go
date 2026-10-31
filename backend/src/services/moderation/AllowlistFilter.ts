/**
 * AllowlistFilter — Layer 2 of Anti-Circumvention Pipeline.
 * Masks legitimate booking context (times, prices, durations, venue pins, dates, small quantities)
 * with inert placeholder tokens to prevent false-positive triggers on innocent conversation.
 */

export interface AllowlistMaskResult {
  maskedText: string;
  maskedItems: { type: string; original: string }[];
}

export class AllowlistFilter {
  /**
   * Masks legitimate patterns in text.
   */
  public static maskAllowlistedPatterns(text: string): AllowlistMaskResult {
    if (!text) return { maskedText: '', maskedItems: [] };

    let current = text;
    const maskedItems: { type: string; original: string }[] = [];

    // Helper to safely replace matches
    const replaceAndRecord = (regex: RegExp, type: string, token: string) => {
      current = current.replace(regex, (match) => {
        maskedItems.push({ type, original: match });
        return token;
      });
    };

    // 1. Legitimate Prices & Bills (e.g., Rs 1500, ₹4,500, 1500 rs, 500 inr, 2000 bucks, 450/-)
    // Matches 1 to 5 digits only (avoids masking full phone numbers)
    replaceAndRecord(
      /(?:(?:rs\.?|₹|inr)\s*(\d{1,5}(?:,\d{2,3})*(?:\.\d{1,2})?|-?\/?)|\b(\d{1,5}(?:,\d{2,3})*)\s*(?:rs|rupees|inr|bucks|\/-)\b)/gi,
      'PRICE',
      ' [PRICE_ALLOWED] '
    );

    // 2. Legitimate Durations (e.g., 2 hours, 1.5 hrs, 30 mins, 45 minutes, 1 hr)
    replaceAndRecord(
      /\b(\d+(?:\.\d+)?)\s*(?:hours?|hrs?|minutes?|mins?|sec|seconds?)\b/gi,
      'DURATION',
      ' [DURATION_ALLOWED] '
    );

    // 3. Legitimate Times (e.g., 6:30 pm, 18:30, at 6 pm, 7:00am, around 5pm, 11 am)
    replaceAndRecord(
      /\b(?:(?:at|around|by)\s+)?(?:1[0-2]|0?[1-9])(?::[0-5]\d)?\s*(?:am|pm)\b/gi,
      'TIME_12H',
      ' [TIME_ALLOWED] '
    );
    replaceAndRecord(
      /\b(?:[01]?\d|2[0-3]):[0-5]\d\b/g,
      'TIME_24H',
      ' [TIME_ALLOWED] '
    );

    // 4. Legitimate Dates (e.g., 24th Oct, 25th October, 25/10/2026, 25-10-2026, 25/10)
    replaceAndRecord(
      /\b([0-2]?\d|3[01])(?:st|nd|rd|th)?\s+(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b/gi,
      'DATE_TEXT',
      ' [DATE_ALLOWED] '
    );
    replaceAndRecord(
      /\b([0-2]?\d|3[01])[\/\-]([01]?\d)[\/\-](?:20\d{2}|\d{2})\b/g,
      'DATE_NUMERIC',
      ' [DATE_ALLOWED] '
    );

    // 5. Legitimate Venue Locations / Pins (e.g. Gate 3, Table 4, Platform 2, Terminal 3, Floor 2, Sector 18, Block C, Metro Gate 2)
    replaceAndRecord(
      /\b(?:gate|table|platform|terminal|floor|sector|block|pillar|shop|counter|seat|metro\s+gate)\s+(?:no\.?\s*)?([a-zA-Z]?\d{1,3}[a-zA-Z]?)\b/gi,
      'VENUE',
      ' [VENUE_ALLOWED] '
    );

    // 6. Legitimate small everyday quantities (e.g. table for 2, 2 coffees, 1 coffee, 2 people, 3 tickets)
    replaceAndRecord(
      /\b(?:table\s+for\s+|order\s+)?([1-9])\s+(?:coffee|coffees|tea|chai|beverage|drink|drinks|people|person|persons|tickets?|seats?|plates?)\b/gi,
      'QUANTITY',
      ' [QUANTITY_ALLOWED] '
    );

    return {
      maskedText: current.replace(/\s+/g, ' ').trim(),
      maskedItems,
    };
  }
}
