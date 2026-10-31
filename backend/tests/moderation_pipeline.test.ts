import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Types } from 'mongoose';
import { Normalizer } from '../src/services/moderation/Normalizer.js';
import { AllowlistFilter } from '../src/services/moderation/AllowlistFilter.js';
import { RuleEngine, RULES } from '../src/services/moderation/RuleEngine.js';
import { CrossMessageDetector } from '../src/services/moderation/CrossMessageDetector.js';
import { StrikeLadderService } from '../src/services/moderation/StrikeLadderService.js';
import { moderationService } from '../src/services/ModerationService.js';
import { chatService } from '../src/services/ChatService.js';
import { UserStrike } from '../src/models/UserStrike.js';
import { BlockedAttempt } from '../src/models/BlockedAttempt.js';
import { AuditLog } from '../src/models/AuditLog.js';
import { Notification } from '../src/models/Notification.js';
import { Booking } from '../src/models/Booking.js';
import { Conversation } from '../src/models/Conversation.js';
import { Message } from '../src/models/Message.js';
import { AppSetting } from '../src/models/AppSetting.js';
import { User } from '../src/models/User.js';
import { AppError } from '../src/utils/AppError.js';

describe('Phase 5: Moderation Pipeline & Anti-Circumvention Engine (B3)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // ── LAYER 1: Normalizer Tests ──────────────────────────────────────────────
  describe('Layer 1: Normalizer', () => {
    it('strips zero-width and invisible unicode characters', () => {
      const invisibleInput = '9\u200B8\u200C1\u200D0\uFEFF234567';
      const norm = Normalizer.normalize(invisibleInput);
      expect(norm.forContactScan).toBe('9810234567');
    });

    it('translates Devanagari numerals (०-९) to standard ASCII (0-9)', () => {
      const devanagariText = 'मेरा नंबर है ९८७६५४३२१०';
      const norm = Normalizer.normalize(devanagariText);
      expect(norm.forContactScan).toContain('9876543210');
    });

    it('translates Arabic-Indic numerals (٠-٩) to ASCII (0-9)', () => {
      const indicText = 'Call ٩٨٧٦٥٤٣٢١٠';
      const norm = Normalizer.normalize(indicText);
      expect(norm.forContactScan).toContain('9876543210');
    });

    it('translates spelled-out English digits to numeric characters', () => {
      const spelledEnglish = 'nine eight seven six five four three two one zero';
      const norm = Normalizer.normalize(spelledEnglish);
      expect(norm.forContactScan).toBe('9876543210');
    });

    it('translates spelled-out Hindi/Hinglish digits to numeric characters', () => {
      const spelledHinglish = 'nau aath saat chhe panch char teen do ek shunya';
      const norm = Normalizer.normalize(spelledHinglish);
      expect(norm.forContactScan).toBe('9876543210');
    });

    it('collapses spaced and punctuation-separated digit sequences', () => {
      const spacedDigits = '9 8 7 - 6 . 5 / 4 3 2 1';
      const collapsed = Normalizer.collapseDigitSeparators(spacedDigits);
      expect(collapsed).toBe('987654321');
    });

    it('collapses obfuscated spaced app keywords and de-leets', () => {
      const obfuscated = 'w h 4 t s @ p p me or i n s t a';
      const norm = Normalizer.normalize(obfuscated);
      expect(norm.forKeywordScan).toContain('whatsapp');
      expect(norm.forKeywordScan).toContain('insta');
    });
  });

  // ── LAYER 2: AllowlistFilter Tests (False-Positive Prevention) ─────────────
  describe('Layer 2: AllowlistFilter', () => {
    it('masks legitimate 12-hour and 24-hour meeting times', () => {
      const timeText = 'Let us meet at 6:30 PM or 18:30 near the cafe';
      const result = AllowlistFilter.maskAllowlistedPatterns(timeText);
      expect(result.maskedText).toContain('[TIME_ALLOWED]');
      expect(result.maskedText).not.toContain('630');
      expect(result.maskedText).not.toContain('1830');
    });

    it('masks legitimate prices, bills, and currency amounts', () => {
      const priceText = 'The dinner was Rs 1500 and coffee was ₹450';
      const result = AllowlistFilter.maskAllowlistedPatterns(priceText);
      expect(result.maskedText).toContain('[PRICE_ALLOWED]');
      expect(result.maskedText).not.toContain('1500');
      expect(result.maskedText).not.toContain('450');
    });

    it('masks booking durations and session lengths', () => {
      const durationText = 'Our booking is for 2 hours or maybe 45 mins';
      const result = AllowlistFilter.maskAllowlistedPatterns(durationText);
      expect(result.maskedText).toContain('[DURATION_ALLOWED]');
      expect(result.maskedText).not.toContain('45');
    });

    it('masks venue landmarks, gate numbers, and table numbers', () => {
      const venueText = 'I am sitting at Table 4 near Gate 3 at Platform 2';
      const result = AllowlistFilter.maskAllowlistedPatterns(venueText);
      expect(result.maskedText).toContain('[VENUE_ALLOWED]');
      expect(result.maskedText).not.toMatch(/\b[234]\b/);
    });

    it('masks calendar dates accurately', () => {
      const dateText = 'Let us schedule for 24th Oct or 25/10/2026';
      const result = AllowlistFilter.maskAllowlistedPatterns(dateText);
      expect(result.maskedText).toContain('[DATE_ALLOWED]');
      expect(result.maskedText).not.toContain('2026');
    });

    it('does NOT mask an actual 10-digit phone number in a message that also contains a time', () => {
      const mixedText = 'Meet me at 6pm, call 9876543210';
      const result = AllowlistFilter.maskAllowlistedPatterns(mixedText);
      expect(result.maskedText).toContain('[TIME_ALLOWED]');
      expect(result.maskedText).toContain('9876543210');
    });
  });

  // ── LAYER 3: RuleEngine Evasion & Safety Tests ─────────────────────────────
  describe('Layer 3: RuleEngine Evaluations', () => {
    it('blocks spaced 10-digit phone numbers', async () => {
      const evalResult = await RuleEngine.evaluate('My number is 9 8 7 6 5 4 3 2 1 0 call me');
      expect(evalResult.decision).toBe('BLOCK');
      expect(evalResult.ruleIds).toContain(RULES.PHONE.id);
      expect(evalResult.score).toBeGreaterThanOrEqual(100);
    });

    it('blocks spelled-out English phone numbers', async () => {
      const evalResult = await RuleEngine.evaluate('Call nine eight seven six five four three two one zero');
      expect(evalResult.decision).toBe('BLOCK');
      expect(evalResult.ruleIds).toContain(RULES.PHONE.id);
    });

    it('blocks spelled-out Hinglish phone numbers', async () => {
      const evalResult = await RuleEngine.evaluate('Call nau aath saat chhe panch char teen do ek shunya');
      expect(evalResult.decision).toBe('BLOCK');
      expect(evalResult.ruleIds).toContain(RULES.PHONE.id);
    });

    it('blocks Devanagari digit phone numbers', async () => {
      const evalResult = await RuleEngine.evaluate('मेरा नंबर ९८७६५४३२१० है');
      expect(evalResult.decision).toBe('BLOCK');
      expect(evalResult.ruleIds).toContain(RULES.PHONE.id);
    });

    it('blocks direct UPI payment VPAs (e.g., @okhdfcbank, @paytm, @ybl)', async () => {
      const evalResult = await RuleEngine.evaluate('Send payment to rahul@okhdfcbank directly');
      expect(evalResult.decision).toBe('BLOCK');
      expect(evalResult.ruleIds).toContain(RULES.UPI.id);
    });

    it('blocks external URLs and messaging shortlinks (e.g. wa.me, t.me)', async () => {
      const evalResult = await RuleEngine.evaluate('Chat with me at wa.me/919999999999');
      expect(evalResult.decision).toBe('BLOCK');
      expect(evalResult.ruleIds).toContain(RULES.URL.id);
    });

    it('blocks social handles (@username) and redirect mentions', async () => {
      const evalResult = await RuleEngine.evaluate('Follow me on @priya_companion_22');
      expect(evalResult.decision).toBe('BLOCK');
      expect(evalResult.ruleIds).toContain(RULES.SOCIAL_HANDLE.id);
    });

    it('blocks Hindi/Hinglish off-platform steering ("bahar milte hain", "cash me denge")', async () => {
      const evalResult1 = await RuleEngine.evaluate('App chhoro, bahar milte hain direct');
      expect(evalResult1.decision).toBe('BLOCK');
      expect(evalResult1.ruleIds).toContain(RULES.OFFPLATFORM_PHRASE.id);

      const evalResult2 = await RuleEngine.evaluate('Payment cash me denge meet par');
      expect(evalResult2.decision).toBe('BLOCK');
      expect(evalResult2.ruleIds).toContain(RULES.OFFPLATFORM_PHRASE.id);
    });

    it('blocks escort and adult solicitation terms under 100% Platonic Code of Conduct', async () => {
      const evalResult = await RuleEngine.evaluate('Are escort services and sensual massage included?');
      expect(evalResult.decision).toBe('BLOCK');
      expect(evalResult.ruleIds).toContain(RULES.ADULT_SOLICITATION.id);
    });

    it('allows benign conversation with meeting logistics and venues without false positives', async () => {
      const benignText = 'Hello! Looking forward to our coffee. Can we meet at Cafe Coffee Day near Gate 2 at 5:00 PM? Table for 2.';
      const evalResult = await RuleEngine.evaluate(benignText);
      expect(evalResult.decision).toBe('ALLOW');
      expect(evalResult.score).toBe(0);
      expect(evalResult.ruleIds).toHaveLength(0);
    });
  });

  // ── LAYER 4: CrossMessageDetector Tests ────────────────────────────────────
  describe('Layer 4: CrossMessageDetector', () => {
    it('detects a phone number split across consecutive messages', () => {
      const history = ['My number is 98102'];
      const incoming = '34567 call me';

      const check = CrossMessageDetector.evaluateTexts(history, incoming);
      expect(check.isEvasion).toBe(true);
      expect(check.ruleId).toBe('RULE_CROSS_MESSAGE_PHONE_SPLIT');
    });

    it('allows separate messages containing innocent times or venue numbers', () => {
      const history = ['Meet me near Gate 2', 'At 6:00 PM'];
      const incoming = 'Table for 2';

      const check = CrossMessageDetector.evaluateTexts(history, incoming);
      expect(check.isEvasion).toBe(false);
    });
  });

  // ── LAYER 5: StrikeLadderService & Progressive Penalties ───────────────────
  describe('Layer 5: StrikeLadderService', () => {
    const testUserId = new Types.ObjectId().toString();

    it('issues a NUDGE on the first violation with zero cooldown duration', async () => {
      vi.spyOn(UserStrike, 'countDocuments').mockResolvedValueOnce(0);
      vi.spyOn(UserStrike, 'create').mockImplementationOnce((doc: any) =>
        Promise.resolve({ _id: new Types.ObjectId(), ...doc } as any)
      );
      vi.spyOn(AuditLog, 'create').mockResolvedValueOnce({} as any);
      vi.spyOn(Notification, 'create').mockResolvedValueOnce({} as any);

      const outcome = await StrikeLadderService.recordViolation({
        userId: testUserId,
        ruleIds: ['RULE_PHONE_DIGIT_SEQUENCE'],
        score: 100,
        reason: 'Phone number exchange attempt',
      });

      expect(outcome.type).toBe('NUDGE');
      expect(outcome.strikeCount).toBe(1);
      expect(outcome.expiresAt).toBeUndefined();
      expect(outcome.userMessage).toContain('Reminder: Sharing contact details');
    });

    it('issues a 15-minute COOLDOWN on the second violation', async () => {
      vi.spyOn(UserStrike, 'countDocuments').mockResolvedValueOnce(1);
      vi.spyOn(UserStrike, 'create').mockImplementationOnce((doc: any) =>
        Promise.resolve({ _id: new Types.ObjectId(), ...doc } as any)
      );
      vi.spyOn(AuditLog, 'create').mockResolvedValueOnce({} as any);
      vi.spyOn(Notification, 'create').mockResolvedValueOnce({} as any);

      const outcome = await StrikeLadderService.recordViolation({
        userId: testUserId,
        ruleIds: ['RULE_PHONE_DIGIT_SEQUENCE'],
        score: 100,
        reason: 'Repeated phone number attempt',
      });

      expect(outcome.type).toBe('COOLDOWN');
      expect(outcome.strikeCount).toBe(2);
      expect(outcome.expiresAt).toBeDefined();
      const diffMinutes = (outcome.expiresAt!.getTime() - Date.now()) / (1000 * 60);
      expect(Math.round(diffMinutes)).toBe(15);
    });

    it('enforces active chat cooldown and returns remaining minutes', async () => {
      const futureExpiry = new Date(Date.now() + 10 * 60 * 1000);
      vi.spyOn(UserStrike, 'findOne').mockReturnValueOnce({
        sort: () => Promise.resolve({
          userId: testUserId,
          expiresAt: futureExpiry,
          reason: '15-minute cooldown active',
        }),
      } as any);

      const cooldown = await StrikeLadderService.checkUserCooldown(testUserId);
      expect(cooldown.isMuted).toBe(true);
      expect(cooldown.remainingMinutes).toBeGreaterThanOrEqual(9);
      expect(cooldown.remainingMinutes).toBeLessThanOrEqual(10);
    });

    it('allows user to submit an appeal and admin to approve it', async () => {
      const strikeId = new Types.ObjectId();
      const mockStrike: any = {
        _id: strikeId,
        userId: testUserId,
        appealed: false,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        save: vi.fn().mockResolvedValue(true),
      };

      vi.spyOn(UserStrike, 'findOne').mockResolvedValueOnce(mockStrike);
      vi.spyOn(AuditLog, 'create').mockResolvedValue({} as any);

      // Submit appeal
      const appealed = await StrikeLadderService.submitAppeal({
        strikeId: strikeId.toString(),
        userId: testUserId,
        reason: 'I was only sharing venue directions, not a phone number.',
      });

      expect(appealed.appealed).toBe(true);
      expect(appealed.appealStatus).toBe('PENDING');

      // Admin review & approve
      vi.spyOn(UserStrike, 'findById').mockResolvedValueOnce(mockStrike);
      vi.spyOn(User, 'findById').mockResolvedValue(null);
      const approved = await StrikeLadderService.reviewAppeal({
        strikeId: strikeId.toString(),
        adminId: new Types.ObjectId().toString(),
        approved: true,
      });

      expect(approved.appealStatus).toBe('APPROVED');
      expect(mockStrike.save).toHaveBeenCalled();
    });
  });

  // ── INTEGRATED PIPELINE: ChatService & ModerationService ───────────────────
  describe('Integrated ChatService Evasion Blocking', () => {
    const seekerId = new Types.ObjectId();
    const partnerId = new Types.ObjectId();
    const bookingId = new Types.ObjectId();

    beforeEach(() => {
      vi.spyOn(AppSetting, 'findOne').mockImplementation((query: any) => {
        if (query?.key === 'chatGraceHours') return Promise.resolve({ value: { hours: 24 } } as any);
        if (query?.key === 'chatMaxLength') return Promise.resolve({ value: { max: 300 } } as any);
        if (query?.key === 'chatRatePerHour') return Promise.resolve({ value: { limit: 20 } } as any);
        return Promise.resolve(null);
      });
      vi.spyOn(Message, 'find').mockReturnValue({
        sort: () => ({ limit: () => ({ lean: () => Promise.resolve([]) }) }),
      } as any);
    });

    it('rejects sending phone number in chat with Strike Notice and 400 PROHIBITED_CONTENT', async () => {
      const mockBooking: any = {
        _id: bookingId,
        clientId: seekerId,
        partnerId,
        stage: 'PAID',
      };
      vi.spyOn(Booking, 'findById').mockResolvedValueOnce(mockBooking);
      vi.spyOn(Conversation, 'findOne').mockResolvedValueOnce({
        _id: new Types.ObjectId(),
        bookingId,
        status: 'OPEN',
      } as any);
      vi.spyOn(Message, 'countDocuments').mockResolvedValue(0);
      vi.spyOn(UserStrike, 'findOne').mockReturnValue({ sort: () => Promise.resolve(null) } as any);
      vi.spyOn(UserStrike, 'countDocuments').mockResolvedValueOnce(0);
      vi.spyOn(UserStrike, 'create').mockImplementationOnce((doc: any) =>
        Promise.resolve({ _id: new Types.ObjectId(), ...doc } as any)
      );
      vi.spyOn(BlockedAttempt, 'create').mockResolvedValueOnce({} as any);
      vi.spyOn(AuditLog, 'create').mockResolvedValue({} as any);
      vi.spyOn(Notification, 'create').mockResolvedValue({} as any);

      await expect(
        chatService.sendMessage({
          bookingId: bookingId.toString(),
          user: { id: seekerId.toString(), roles: ['SEEKER'] },
          kind: 'TEXT',
          text: 'Call me on 9876543210 please',
        })
      ).rejects.toThrowError(AppError);
    });

    it('rejects sending when user is in active cooldown (403 CHAT_COOLDOWN)', async () => {
      const mockBooking: any = {
        _id: bookingId,
        clientId: seekerId,
        partnerId,
        stage: 'PAID',
      };
      vi.spyOn(Booking, 'findById').mockResolvedValueOnce(mockBooking);
      vi.spyOn(Conversation, 'findOne').mockResolvedValueOnce({
        _id: new Types.ObjectId(),
        bookingId,
        status: 'OPEN',
      } as any);

      // User has active cooldown
      vi.spyOn(UserStrike, 'findOne').mockReturnValue({
        sort: () =>
          Promise.resolve({
            userId: seekerId.toString(),
            expiresAt: new Date(Date.now() + 12 * 60 * 1000),
            reason: 'Repeated phone number attempt',
          }),
      } as any);

      await expect(
        chatService.sendMessage({
          bookingId: bookingId.toString(),
          user: { id: seekerId.toString(), roles: ['SEEKER'] },
          kind: 'TEXT',
          text: 'Hello, are we still meeting?',
        })
      ).rejects.toThrowError(/cooldown/i);
    });

    it('allows benign meeting coordination message and records ALLOW moderation metadata', async () => {
      const mockBooking: any = {
        _id: bookingId,
        clientId: seekerId,
        partnerId,
        stage: 'PAID',
      };
      const mockConv: any = {
        _id: new Types.ObjectId(),
        bookingId,
        status: 'OPEN',
        save: vi.fn().mockResolvedValue(true),
      };
      vi.spyOn(Booking, 'findById').mockResolvedValueOnce(mockBooking);
      vi.spyOn(Conversation, 'findOne').mockResolvedValueOnce(mockConv);
      vi.spyOn(Message, 'countDocuments').mockResolvedValue(0);
      vi.spyOn(UserStrike, 'findOne').mockReturnValue({ sort: () => Promise.resolve(null) } as any);
      vi.spyOn(Message, 'find').mockReturnValue({
        sort: () => ({ limit: () => ({ lean: () => Promise.resolve([]) }) }),
      } as any);

      const createdMsg: any = {
        _id: new Types.ObjectId(),
        bookingId,
        senderId: seekerId,
        recipientId: partnerId,
        kind: 'TEXT',
        text: 'Let us meet near Gate 2 at 5:00 PM',
        moderation: { decision: 'ALLOW', score: 0, ruleIds: [] },
        flagged: false,
        createdAt: new Date(),
      };
      vi.spyOn(Message, 'create').mockResolvedValueOnce(createdMsg);

      const sent = await chatService.sendMessage({
        bookingId: bookingId.toString(),
        user: { id: seekerId.toString(), roles: ['SEEKER'] },
        kind: 'TEXT',
        text: 'Let us meet near Gate 2 at 5:00 PM',
      });

      expect(sent).toBeDefined();
      expect(sent.kind).toBe('TEXT');
      expect(sent.moderation?.decision).toBe('ALLOW');
      expect(sent.flagged).toBe(false);
    });
  });
});
