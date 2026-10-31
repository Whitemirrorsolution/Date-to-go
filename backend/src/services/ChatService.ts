import { Types } from 'mongoose';
import { Booking, type IBooking } from '../models/Booking.js';
import { Conversation, type IConversation, type ConversationStatus } from '../models/Conversation.js';
import { Message, type IMessage, type MessageKind } from '../models/Message.js';
import { QuickReplyTemplate, type IQuickReplyTemplate } from '../models/QuickReplyTemplate.js';
import { AppSetting } from '../models/AppSetting.js';
import { AppError } from '../utils/AppError.js';
import { emitEvent } from '../utils/events.js';
import { moderationService } from './ModerationService.js';
import { StrikeLadderService } from './moderation/StrikeLadderService.js';

export interface ChatPermissions {
  status: ConversationStatus;
  canSendText: boolean;
  canSendQuickReply: boolean;
  maxChars: number;
  remainingNotes?: number;
  notice: string;
}

export interface ChatWindowResult {
  conversation: IConversation;
  booking: IBooking;
  isSeeker: boolean;
  isPartner: boolean;
  recipientId: string;
  permissions: ChatPermissions;
}

export class ChatService {
  /**
   * Determine dynamic conversation status and window permissions from booking stage and timestamps.
   */
  public async evaluateWindow(booking: IBooking, user: { id: string; roles?: string[] }): Promise<ChatWindowResult> {
    const isAdmin = Boolean(user.roles?.includes('ADMIN'));
    const isSeeker = booking.clientId.toString() === user.id;
    const isPartner = booking.partnerId.toString() === user.id;

    if (!isSeeker && !isPartner && !isAdmin) {
      throw new AppError('Unauthorized access to booking conversation', 403, 'FORBIDDEN');
    }

    const recipientId = isSeeker ? booking.partnerId.toString() : booking.clientId.toString();

    // Load admin settings
    const graceSetting = await AppSetting.findOne({ key: 'chatGraceHours' });
    const graceHours = (graceSetting?.value as { hours?: number } | undefined)?.hours ?? 24;

    const maxLenSetting = await AppSetting.findOne({ key: 'chatMaxLength' });
    const maxLen = (maxLenSetting?.value as { max?: number } | undefined)?.max ?? 300;

    let status: ConversationStatus = 'LOCKED';
    let canSendText = false;
    let canSendQuickReply = false;
    let effectiveMaxChars = maxLen;
    let remainingNotes = 0;
    let notice = 'Chat is closed for this booking.';

    const stage = booking.stage;

    if (stage === 'REQUESTED') {
      status = 'LOCKED';
      // Seeker can send 1 optional note of max 150 chars
      const msgCount = await Message.countDocuments({ bookingId: booking._id, senderId: user.id });
      remainingNotes = Math.max(0, 1 - msgCount);
      canSendText = isSeeker && remainingNotes > 0;
      canSendQuickReply = false;
      effectiveMaxChars = 150;
      notice = canSendText
        ? 'Booking requested. You may send 1 initial greeting note (max 150 chars).'
        : 'Initial request note already sent. Chat unlocks upon acceptance & payment.';
    } else if (stage === 'ACCEPTED' || stage === 'PAYMENT_PENDING') {
      status = 'LOCKED';
      canSendText = false;
      canSendQuickReply = true;
      notice = 'Booking accepted! Payment is pending. You can exchange quick-reply coordination templates.';
    } else if (stage === 'PAID' || stage === 'IN_PROGRESS' || stage === 'AWAITING_OTP') {
      status = 'OPEN';
      canSendText = true;
      canSendQuickReply = true;
      effectiveMaxChars = maxLen;
      notice = 'Chat is OPEN. Messages are scanned for safety. Never share off-app contacts or cash payment.';
    } else if (stage === 'COMPLETED') {
      const completionTime = booking.endAt ? new Date(booking.endAt).getTime() : booking.updatedAt.getTime();
      const hoursSinceEnd = (Date.now() - completionTime) / (1000 * 60 * 60);

      if (hoursSinceEnd <= graceHours) {
        status = 'OPEN';
        canSendText = true;
        canSendQuickReply = true;
        notice = `Booking completed. Chat remains open for ${Math.ceil(graceHours - hoursSinceEnd)}h for post-meeting coordination.`;
      } else {
        status = 'READ_ONLY';
        canSendText = false;
        canSendQuickReply = false;
        notice = 'Chat grace period has expired. This conversation is now archived in read-only mode.';
      }
    } else {
      // CANCELLED, DECLINED, EXPIRED
      status = 'CLOSED';
      canSendText = false;
      canSendQuickReply = false;
      notice = 'This booking was cancelled or expired. Conversation is closed.';
    }

    // Get or create conversation record
    let conversation = await Conversation.findOne({ bookingId: booking._id });
    if (!conversation) {
      conversation = await Conversation.create({
        bookingId: booking._id,
        seekerId: booking.clientId,
        partnerId: booking.partnerId,
        status,
        openedAt: status === 'OPEN' ? new Date() : undefined,
      });
    } else if (conversation.status !== status) {
      conversation.status = status;
      if (status === 'OPEN' && !conversation.openedAt) {
        conversation.openedAt = new Date();
      }
      await conversation.save();
    }

    return {
      conversation,
      booking,
      isSeeker,
      isPartner,
      recipientId,
      permissions: {
        status,
        canSendText,
        canSendQuickReply,
        maxChars: effectiveMaxChars,
        remainingNotes,
        notice,
      },
    };
  }

  /**
   * Enforces 20 messages/hour rate limit per user per conversation.
   */
  public async checkRateLimit(bookingId: Types.ObjectId, userId: string): Promise<void> {
    const rateSetting = await AppSetting.findOne({ key: 'chatRatePerHour' });
    const limit = (rateSetting?.value as { limit?: number } | undefined)?.limit ?? 20;

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentCount = await Message.countDocuments({
      bookingId,
      senderId: userId,
      createdAt: { $gte: oneHourAgo },
    });

    if (recentCount >= limit) {
      throw new AppError(
        `Rate limit exceeded. You can send at most ${limit} messages per hour in this chat.`,
        429,
        'RATE_LIMIT_EXCEEDED'
      );
    }
  }

  /**
   * Basic anti-circumvention stub scanner for Phase 4.
   * Catches obvious phone numbers, URLs, UPI handles, and external contact requests.
   */
  public validateTextContent(text: string): { cleanText: string; flagged: boolean } {
    const trimmed = text.trim();

    // Check for 8+ digit sequences (potential phone number)
    const digitsOnly = trimmed.replace(/\D/g, '');
    if (digitsOnly.length >= 8) {
      throw new AppError(
        "For your safety and payment protection, phone numbers and contact details cannot be shared here.",
        400,
        'PROHIBITED_CONTENT'
      );
    }

    // Check for URLs or domain patterns
    const urlPattern = /(https?:\/\/|www\.|\.com|\.in|\.org|\.net|\.io|\.me)/i;
    if (urlPattern.test(trimmed)) {
      throw new AppError(
        "For your safety, external website links and URLs cannot be shared here.",
        400,
        'PROHIBITED_CONTENT'
      );
    }

    // Check for UPI handles or @handles
    const upiPattern = /([a-zA-Z0-9.\-_]{2,}@(okhdfcbank|okaxis|oksbi|okicici|paytm|ybl|upi|apl))/i;
    if (upiPattern.test(trimmed)) {
      throw new AppError(
        "Direct off-platform payment handles (UPI) are strictly prohibited. Payments must go through escrow.",
        400,
        'PROHIBITED_CONTENT'
      );
    }

    // Suspicious keywords to flag
    const suspiciousPattern = /\b(whatsapp|telegram|instagram|insta|snapchat|cash|advance pay|bahar)\b/i;
    const flagged = suspiciousPattern.test(trimmed);

    return { cleanText: trimmed, flagged };
  }

  /**
   * Send a validated message within the current state window.
   */
  public async sendMessage(params: {
    bookingId: string;
    user: { id: string; roles?: string[] };
    kind: MessageKind;
    text?: string | undefined;
    quickReplyKey?: string | undefined;
  }): Promise<IMessage> {
    const booking = await Booking.findById(params.bookingId);
    if (!booking) {
      throw new AppError('Booking not found', 404, 'BOOKING_NOT_FOUND');
    }

    const window = await this.evaluateWindow(booking, params.user);
    const { permissions, recipientId, conversation } = window;

    // Check user chat cooldown / active strike restriction
    const cooldown = await StrikeLadderService.checkUserCooldown(params.user.id);
    if (cooldown.isMuted) {
      throw new AppError(
        `You are temporarily in a chat cooldown (${cooldown.remainingMinutes} min remaining). Reason: ${cooldown.reason || 'Policy violation'}`,
        403,
        'CHAT_COOLDOWN'
      );
    }

    // Enforce rate limit
    await this.checkRateLimit(booking._id, params.user.id);

    let finalText = '';
    let quickKey: string | undefined = undefined;

    if (params.kind === 'QUICK_REPLY') {
      if (!permissions.canSendQuickReply) {
        throw new AppError('Quick replies are not allowed in the current booking state', 400, 'ACTION_NOT_ALLOWED');
      }

      if (!params.quickReplyKey) {
        throw new AppError('quickReplyKey is required for QUICK_REPLY kind', 400, 'INVALID_INPUT');
      }

      const template = await QuickReplyTemplate.findOne({ key: params.quickReplyKey, enabled: true });
      if (!template) {
        throw new AppError('Selected quick-reply template does not exist or is disabled', 404, 'TEMPLATE_NOT_FOUND');
      }

      finalText = template.textEn;
      quickKey = template.key;
    } else if (params.kind === 'TEXT') {
      if (!permissions.canSendText) {
        throw new AppError(permissions.notice || 'Direct text chat is not permitted in this booking state', 400, 'CHAT_LOCKED');
      }

      if (!params.text || params.text.trim().length === 0) {
        throw new AppError('Message text cannot be empty', 400, 'EMPTY_TEXT');
      }

      if (params.text.length > permissions.maxChars) {
        throw new AppError(`Message exceeds maximum allowed length of ${permissions.maxChars} characters`, 400, 'TEXT_TOO_LONG');
      }

      const modResult = await moderationService.evaluateChatMessage({
        text: params.text,
        senderId: params.user.id,
        bookingId: booking._id.toString(),
        conversationId: conversation._id.toString(),
      });

      if (modResult.decision === 'BLOCK') {
        throw new AppError(
          modResult.userNotice ||
            'Message blocked: Sharing contact details, phone numbers, or off-platform payment info is prohibited.',
          400,
          'PROHIBITED_CONTENT'
        );
      }

      finalText = params.text.trim();

      const message = await Message.create({
        bookingId: booking._id,
        conversationId: conversation._id,
        senderId: params.user.id,
        recipientId,
        kind: 'TEXT',
        text: finalText,
        moderation: {
          decision: modResult.decision,
          score: modResult.score,
          ruleIds: modResult.ruleIds,
          lexiconVersion: 1,
        },
        flagged: modResult.decision === 'ALLOW_AND_FLAG',
        deliveredAt: new Date(),
      });

      conversation.lastMessageAt = new Date();
      await conversation.save();

      emitEvent('chat.message', {
        bookingId: booking._id.toString(),
        conversationId: conversation._id.toString(),
        messageId: message._id.toString(),
        senderId: params.user.id,
        recipientId,
        text: finalText,
        kind: 'TEXT',
        createdAt: message.createdAt,
      });

      return message;
    } else {
      throw new AppError(`Unsupported message kind: ${params.kind}`, 400, 'INVALID_KIND');
    }

    const message = await Message.create({
      bookingId: booking._id,
      conversationId: conversation._id,
      senderId: params.user.id,
      recipientId,
      kind: 'QUICK_REPLY',
      text: finalText,
      quickReplyKey: quickKey,
      flagged: false,
      deliveredAt: new Date(),
    });

    conversation.lastMessageAt = new Date();
    await conversation.save();

    emitEvent('chat.message', {
      bookingId: booking._id.toString(),
      conversationId: conversation._id.toString(),
      messageId: message._id.toString(),
      senderId: params.user.id,
      recipientId,
      text: finalText,
      kind: 'QUICK_REPLY',
      quickReplyKey: quickKey,
      createdAt: message.createdAt,
    });

    return message;
  }

  /**
   * Fetch active quick reply templates filtered by stage and role.
   */
  public async getTemplates(stage: string, role: 'SEEKER' | 'PARTNER'): Promise<IQuickReplyTemplate[]> {
    return await QuickReplyTemplate.find({
      enabled: true,
      phases: stage,
      role: { $in: ['ALL', role] },
    }).sort({ order: 1 });
  }
}

export const chatService = new ChatService();
