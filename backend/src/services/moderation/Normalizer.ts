/**
 * Normalizer — Layer 1 of Anti-Circumvention Pipeline.
 * Strips zero-width and invisible characters, expands Devanagari & Arabic-Indic digits,
 * decodes spelled-out Hindi/Hinglish/English number words, de-leets characters,
 * and collapses obfuscated spacing in phone numbers and keywords.
 */

// Mapping of English number words to digits
const ENGLISH_NUMBER_WORDS: Record<string, string> = {
  zero: '0',
  one: '1',
  two: '2',
  three: '3',
  four: '4',
  five: '5',
  six: '6',
  seven: '7',
  eight: '8',
  nine: '9',
  ten: '10',
};

// Mapping of Hindi & Hinglish number words to digits
const HINGLISH_NUMBER_WORDS: Record<string, string> = {
  shunya: '0',
  sunya: '0',
  zero: '0',
  ek: '1',
  aik: '1',
  do: '2',
  teen: '3',
  tin: '3',
  char: '4',
  chaar: '4',
  panch: '5',
  paanch: '5',
  chhe: '6',
  chhah: '6',
  che: '6',
  cheh: '6',
  saat: '7',
  sat: '7',
  aath: '8',
  ath: '8',
  nau: '9',
  no: '9',
  das: '10',
  dus: '10',
};

// De-leet dictionary for keyword detection
const LEET_CHAR_MAP: Record<string, string> = {
  '@': 'a',
  '4': 'a',
  '8': 'b',
  '(': 'c',
  '3': 'e',
  '9': 'g',
  '!': 'i',
  '1': 'i',
  '|': 'l',
  '0': 'o',
  '5': 's',
  '$': 's',
  '+': 't',
  '7': 't',
};

export interface NormalizedResult {
  raw: string;
  cleaned: string;
  forContactScan: string;
  forKeywordScan: string;
}

export class Normalizer {
  /**
   * Strip zero-width, non-printable, and unicode directional control characters.
   */
  public static stripInvisibleChars(text: string): string {
    if (!text) return '';
    return (
      text
        // Unicode NFKC normalization
        .normalize('NFKC')
        // Zero-width spaces, joiners, soft hyphens, byte order marks, RTL marks
        .replace(/[\u200B-\u200D\uFEFF\u00AD\u200E\u200F\u202A-\u202E]/g, '')
        // Non-standard whitespace (NBSP, em space, en space, thin space)
        .replace(/[\u00A0\u1680\u2000-\u200A\u2028\u2029\u202F\u205F\u3000]/g, ' ')
    );
  }

  /**
   * Translate Devanagari (०-९) and Arabic-Indic (٠-٩) digits to ASCII (0-9).
   */
  public static translateDevanagariDigits(text: string): string {
    return text
      .replace(/[०-९]/g, (ch) => String(ch.charCodeAt(0) - 0x0966))
      .replace(/[٠-٩]/g, (ch) => String(ch.charCodeAt(0) - 0x0660));
  }

  /**
   * Replace spelled-out English & Hinglish number words with their numeric digits.
   * e.g., "nau aath saat" -> "9 8 7"
   */
  public static expandNumberWords(text: string): string {
    // Regex matching word tokens
    return text.replace(/\b([a-zA-Z]+)\b/g, (match, word: string) => {
      const lower = word.toLowerCase();
      if (ENGLISH_NUMBER_WORDS[lower] !== undefined) {
        return ENGLISH_NUMBER_WORDS[lower]!;
      }
      if (HINGLISH_NUMBER_WORDS[lower] !== undefined) {
        return HINGLISH_NUMBER_WORDS[lower]!;
      }
      return match;
    });
  }

  /**
   * Collapses common spaced or separated digit patterns:
   * e.g., "9 8 7 - 6 . 5 / 4 3 2 1" -> "987654321"
   */
  public static collapseDigitSeparators(text: string): string {
    // Repeatedly collapse single-digit separated groups
    // Replace digit followed by whitespace/hyphen/dot/slash/comma and another digit
    let prev = text;
    let curr = text;
    for (let i = 0; i < 15; i++) {
      curr = curr.replace(/(\d)[\s\-.,/\\_+=:]+(\d)/g, '$1$2');
      if (curr === prev) break;
      prev = curr;
    }
    return curr;
  }

  /**
   * Collapses spaced letter sequences for known off-platform keywords:
   * e.g. "w h a t s a p p" -> "whatsapp", "i n s t a" -> "insta", "t e l e g r a m" -> "telegram"
   */
  public static collapseSpacedWords(text: string): string {
    const targetWords = [
      'whatsapp',
      'telegram',
      'instagram',
      'insta',
      'snapchat',
      'snap',
      'paytm',
      'gpay',
      'phonepe',
      'cash',
      'bahar',
      'escort',
      'callgirl',
    ];

    let result = text;
    for (const word of targetWords) {
      // Build regex for spaced letters: e.g. w\s*h\s*a\s*t\s*s\s*a\s*p\s*p
      const spacedPattern = word.split('').map((c) => (c === '$' ? '\\$' : c)).join('[\\s._-]*');
      const regex = new RegExp(`\\b${spacedPattern}\\b`, 'gi');
      result = result.replace(regex, word);
    }
    return result;
  }

  /**
   * De-leets text into phonetic/alphabetic equivalents for keyword scanning.
   */
  public static deLeet(text: string): string {
    let result = '';
    for (let i = 0; i < text.length; i++) {
      const ch = text[i]!;
      result += LEET_CHAR_MAP[ch] ?? ch;
    }
    return result;
  }

  /**
   * Generates full normalized representations for both contact detection and keyword analysis.
   */
  public static normalize(rawText: string): NormalizedResult {
    if (!rawText) {
      return { raw: '', cleaned: '', forContactScan: '', forKeywordScan: '' };
    }

    const cleaned = Normalizer.stripInvisibleChars(rawText).trim();

    // 1. For Contact Detection:
    // Translate devanagari/indic digits -> expand number words -> collapse digit separators
    let contact = Normalizer.translateDevanagariDigits(cleaned);
    contact = Normalizer.expandNumberWords(contact);
    const forContactScan = Normalizer.collapseDigitSeparators(contact);

    // 2. For Keyword Detection:
    // Collapse spaced words -> lowercase -> de-leet -> collapse excessive spaces
    let kw = Normalizer.collapseSpacedWords(cleaned.toLowerCase());
    kw = Normalizer.deLeet(kw);
    // Also collapse spaced words again after de-leeting (e.g., "w h 4 t s @ p p")
    kw = Normalizer.collapseSpacedWords(kw);
    const forKeywordScan = kw.replace(/\s+/g, ' ').trim();

    return {
      raw: rawText,
      cleaned,
      forContactScan,
      forKeywordScan,
    };
  }
}
