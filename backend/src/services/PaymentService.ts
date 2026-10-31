/**
 * PaymentService — Razorpay order creation, signature verification, webhook processing,
 * subscription lifecycle fulfillment, refunds, and audit logging.
 *
 * Rules:
 * - Amount ALWAYS fetched from Plan document in DB — NEVER trusted from client.
 * - Raw body webhook signature verification (HMAC SHA-256).
 * - Webhooks are idempotent (stores processed event IDs).
 * - Never logs card/UPI details.
 */
import crypto from 'crypto';
import Razorpay from 'razorpay';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { AppError } from '../utils/AppError.js';
import { Plan, type IPlan } from '../models/Plan.js';
import { Payment, type IPayment } from '../models/Payment.js';
import { Subscription } from '../models/Subscription.js';
import { PartnerProfile } from '../models/PartnerProfile.js';
import { User } from '../models/User.js';
import { AuditLog } from '../models/AuditLog.js';
import { Notification } from '../models/Notification.js';
import { invoiceService } from './InvoiceService.js';
import { Booking } from '../models/Booking.js';
import { Listing } from '../models/Listing.js';
import { otpService } from './OtpService.js';

export interface CreateOrderResult {
  orderId: string;
  amountPaise: number;
  currency: string;
  keyId: string;
  plan: {
    id: string;
    name: string;
    durationDays: number;
    audience: string;
  };
}

export class PaymentService {
  private razorpayClient: Razorpay | null = null;

  private getRazorpay(): Razorpay {
    if (!this.razorpayClient) {
      this.razorpayClient = new Razorpay({
        key_id: env.RAZORPAY_KEY_ID,
        key_secret: env.RAZORPAY_KEY_SECRET,
      });
    }
    return this.razorpayClient;
  }

  /**
   * Creates a Razorpay Order server-side for a given Plan.
   * Plan price is ALWAYS taken from DB to prevent client tampering.
   */
  async createPlanOrder(userId: string, planId: string): Promise<CreateOrderResult> {
    const plan = await Plan.findById(planId);
    if (!plan || !plan.isActive) {
      throw new AppError('Plan not found or is currently inactive', 404, 'PLAN_NOT_FOUND');
    }

    const user = await User.findById(userId);
    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    // Anyone can purchase any plan. Roles/Entitlements are updated on successful payment.

    let razorpayOrderId: string;

    try {
      // Create order with Razorpay
      const order = await this.getRazorpay().orders.create({
        amount: plan.pricePaise,
        currency: 'INR',
        receipt: `rcpt_${userId.slice(-6)}_${Date.now().toString().slice(-6)}`,
        notes: {
          userId,
          planId: plan.id.toString(),
          planName: plan.name,
          audience: plan.audience,
        },
      });
      razorpayOrderId = order.id;
    } catch (err) {
      // In test / offline environments, fallback to deterministic mock order if Razorpay rejects placeholder keys
      if (env.NODE_ENV === 'test' || env.RAZORPAY_KEY_ID.includes('placeholder')) {
        razorpayOrderId = `order_mock_${crypto.randomBytes(8).toString('hex')}`;
      } else {
        logger.error({ err, userId, planId }, 'Razorpay order creation failed');
        throw new AppError('Payment gateway error. Please try again.', 502, 'GATEWAY_ERROR');
      }
    }

    // Persist Payment record with status CREATED
    await Payment.create({
      userId,
      purpose: 'PLAN',
      planId: plan._id,
      razorpayOrderId,
      amountPaise: plan.pricePaise,
      status: 'CREATED',
    });

    logger.info({ userId, planId, razorpayOrderId, amountPaise: plan.pricePaise }, 'Payment order created');

    return {
      orderId: razorpayOrderId,
      amountPaise: plan.pricePaise,
      currency: 'INR',
      keyId: env.RAZORPAY_KEY_ID,
      plan: {
        id: plan.id.toString(),
        name: plan.name,
        durationDays: plan.durationDays,
        audience: plan.audience,
      },
    };
  }

  async createBookingOrder(userId: string, bookingId: string): Promise<{
    orderId: string;
    amountPaise: number;
    currency: string;
    keyId: string;
  }> {
    const booking = await Booking.findOne({ _id: bookingId, clientId: userId });
    if (!booking) throw new AppError('Booking not found', 404, 'BOOKING_NOT_FOUND');
    if (booking.stage !== 'ACCEPTED') {
      throw new AppError('Booking is not awaiting payment', 400, 'INVALID_BOOKING_STATE');
    }

    let razorpayOrderId: string;
    try {
      const order = await this.getRazorpay().orders.create({
        amount: booking.totalPaise,
        currency: 'INR',
        receipt: `bk_${booking.id.toString().slice(-8)}_${Date.now().toString().slice(-6)}`,
        notes: { userId, bookingId },
      });
      razorpayOrderId = order.id;
    } catch (err) {
      if (env.NODE_ENV === 'test' || env.RAZORPAY_KEY_ID.includes('placeholder')) {
        razorpayOrderId = `order_mock_${crypto.randomBytes(8).toString('hex')}`;
      } else {
        logger.error({ err, userId, bookingId }, 'Razorpay booking order creation failed');
        throw new AppError('Payment gateway error. Please try again.', 502, 'GATEWAY_ERROR');
      }
    }

    await Payment.create({
      userId,
      purpose: 'BOOKING',
      bookingId: booking._id,
      razorpayOrderId,
      amountPaise: booking.totalPaise,
      status: 'CREATED',
    });

    booking.stage = 'PAYMENT_PENDING';
    await booking.save();

    return { orderId: razorpayOrderId, amountPaise: booking.totalPaise, currency: 'INR', keyId: env.RAZORPAY_KEY_ID };
  }

  async verifyAndCaptureBooking(
    userId: string,
    bookingId: string,
    razorpayOrderId: string,
    razorpayPaymentId: string,
    razorpaySignature: string,
  ): Promise<{ success: boolean; bookingId: string }> {
    if (!this.verifyPaymentSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature)) {
      throw new AppError('Invalid payment signature', 400, 'INVALID_SIGNATURE');
    }

    const payment = await Payment.findOne({ razorpayOrderId, userId, purpose: 'BOOKING' });
    if (!payment) throw new AppError('Booking payment not found', 404, 'PAYMENT_NOT_FOUND');
    if (!payment.bookingId) throw new AppError('Payment is not linked to a booking', 400, 'INVALID_PAYMENT');
    if (payment.bookingId.toString() !== bookingId) {
      throw new AppError('Payment does not belong to this booking', 403, 'PAYMENT_BOOKING_MISMATCH');
    }

    await this.captureBookingPayment(payment, razorpayPaymentId);
    return { success: true, bookingId: payment.bookingId.toString() };
  }

  private async captureBookingPayment(payment: IPayment, razorpayPaymentId: string, eventId?: string): Promise<void> {
    if (payment.purpose !== 'BOOKING' || !payment.bookingId) {
      throw new AppError('Payment is not for a booking', 400, 'INVALID_PAYMENT');
    }
    if (eventId && payment.rawWebhookEventIds.includes(eventId)) return;
    if (payment.status !== 'CAPTURED') {
      if (payment.status !== 'CREATED') throw new AppError('Payment is not in a capturable state', 400, 'INVALID_PAYMENT_STATUS');
      payment.status = 'CAPTURED';
      payment.razorpayPaymentId = razorpayPaymentId;
      if (eventId) payment.rawWebhookEventIds.push(eventId);
      await payment.save();
    }

    const booking = await Booking.findOne({ _id: payment.bookingId, clientId: payment.userId });
    if (!booking) throw new AppError('Booking not found for payment', 404, 'BOOKING_NOT_FOUND');
    if (booking.stage !== 'PAID') {
      if (booking.stage !== 'PAYMENT_PENDING' && booking.stage !== 'ACCEPTED') {
        throw new AppError('Booking is not awaiting payment', 400, 'INVALID_BOOKING_STATE');
      }

      const { rawOtp, hash } = otpService.generateBookingOtp(booking.id.toString());
      booking.stage = 'PAID';
      booking.otpHash = hash;
      booking.startPin = rawOtp;
      booking.otpExpiresAt = new Date(booking.endAt.getTime() + 24 * 60 * 60 * 1000);
      booking.otpAttempts = 0;
      await booking.save();
      await Listing.findByIdAndUpdate(booking.listingId, { status: 'BOOKED' });

      // Notify partner
      await Notification.create({
        userId: booking.partnerId,
        title: 'Payment Received! Date Confirmed 🎉',
        message: `Payment for your booking at ${booking.venueName} has been received into escrow. Chat is now open!`,
        type: 'BOOKING_UPDATE',
      });
    }
  }

  /**
   * Verifies client-side Razorpay signature (HMAC SHA-256).
   */
  verifyPaymentSignature(
    razorpayOrderId: string,
    razorpayPaymentId: string,
    razorpaySignature: string,
  ): boolean {
    const generatedSignature = crypto
      .createHmac('sha256', env.RAZORPAY_KEY_SECRET)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest('hex');

    const bufA = Buffer.from(generatedSignature, 'utf-8');
    const bufB = Buffer.from(razorpaySignature, 'utf-8');
    if (bufA.length !== bufB.length) return false;

    return crypto.timingSafeEqual(bufA, bufB);
  }

  async activateSubscriptionFromPayment(
    paymentId: string,
    razorpayPaymentId?: string,
    webhookEventId?: string
  ): Promise<{ success: boolean; subscriptionId: string; invoiceNumber: string }> {
    const updatePayload: any = { status: 'CAPTURED' };
    if (razorpayPaymentId) updatePayload.razorpayPaymentId = razorpayPaymentId;
    if (webhookEventId) {
      updatePayload.$addToSet = { rawWebhookEventIds: webhookEventId };
    }

    const query: any = { _id: paymentId, status: { $ne: 'CAPTURED' } };

    const payment = await Payment.findOneAndUpdate(
      query,
      webhookEventId ? { $set: { status: 'CAPTURED', razorpayPaymentId }, $addToSet: { rawWebhookEventIds: webhookEventId } } : { $set: updatePayload },
      { new: true }
    );

    if (!payment) {
      // Payment might already be CAPTURED
      const existingPayment = await Payment.findById(paymentId);
      if (!existingPayment) {
        throw new AppError('Payment record not found', 404, 'PAYMENT_NOT_FOUND');
      }
      if (existingPayment.status === 'CAPTURED') {
        const sub = await Subscription.findOne({ paymentId });
        if (!sub) {
          throw new AppError('Payment is currently being processed by another request', 409, 'PAYMENT_PROCESSING');
        }
        return {
          success: true,
          subscriptionId: sub.id.toString(),
          invoiceNumber: existingPayment.invoiceNumber || '',
        };
      }
      throw new AppError('Payment is not in a valid state for activation', 400);
    }

    if (payment.purpose !== 'PLAN') {
      throw new AppError('Payment is not for a subscription plan', 400, 'INVALID_PAYMENT');
    }

    const plan = await Plan.findById(payment.planId);
    if (!plan) {
      throw new AppError('Plan associated with payment not found', 404, 'PLAN_NOT_FOUND');
    }

    const sub = await this.fulfillSubscription(payment, plan);

    return {
      success: true,
      subscriptionId: sub.id.toString(),
      invoiceNumber: payment.invoiceNumber || '',
    };
  }

  /**
   * Verify and process client verification callback.
   */
  async verifyAndFulfill(
    userId: string,
    razorpayOrderId: string,
    razorpayPaymentId: string,
    razorpaySignature: string,
  ): Promise<{ success: boolean; subscriptionId: string; invoiceNumber: string }> {
    const isValid = this.verifyPaymentSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature);
    if (!isValid) {
      logger.warn({ userId, razorpayOrderId, razorpayPaymentId }, 'Tampered payment signature rejected');
      throw new AppError('Invalid payment signature', 400, 'INVALID_SIGNATURE');
    }

    const payment = await Payment.findOne({ razorpayOrderId, userId });
    if (!payment) {
      throw new AppError('Payment record not found', 404, 'PAYMENT_NOT_FOUND');
    }
    if (payment.purpose !== 'PLAN') {
      throw new AppError('Payment is not for a subscription plan', 400, 'INVALID_PAYMENT');
    }

    return this.activateSubscriptionFromPayment(payment.id, razorpayPaymentId);
  }

  /**
   * Process incoming Razorpay webhook.
   * Must use raw body string/buffer for HMAC SHA-256 verification.
   */
  async handleWebhook(rawBody: string | Buffer, signatureHeader: string): Promise<{ received: boolean }> {
    if (!signatureHeader) {
      throw new AppError('Missing webhook signature header', 400, 'MISSING_SIGNATURE');
    }

    const expectedSignature = crypto
      .createHmac('sha256', env.RAZORPAY_WEBHOOK_SECRET)
      .update(rawBody)
      .digest('hex');

    const bufA = Buffer.from(expectedSignature, 'utf-8');
    const bufB = Buffer.from(signatureHeader, 'utf-8');
    if (bufA.length !== bufB.length) {
      throw new AppError('Invalid webhook signature', 400, 'INVALID_WEBHOOK_SIGNATURE');
    }

    const isValid = crypto.timingSafeEqual(bufA, bufB);

    if (!isValid) {
      logger.warn('Webhook signature mismatch');
      throw new AppError('Invalid webhook signature', 400, 'INVALID_WEBHOOK_SIGNATURE');
    }

    const event = typeof rawBody === 'string' ? JSON.parse(rawBody) : JSON.parse(rawBody.toString('utf-8'));
    const eventId = event.event_id || event.id || `${event.event}_${Date.now()}`;
    const eventType = event.event;

    logger.info({ eventType, eventId }, 'Razorpay webhook received');

    // Handle payment.captured
    if (eventType === 'payment.captured') {
      const paymentEntity = event.payload?.payment?.entity;
      const orderId = paymentEntity?.order_id;
      const paymentId = paymentEntity?.id;

      if (!orderId) return { received: true };

      const payment = await Payment.findOne({ razorpayOrderId: orderId });
      if (!payment) {
        logger.warn({ orderId }, 'Payment not found for captured webhook event');
        return { received: true };
      }

      if (payment.purpose === 'BOOKING') {
        await this.captureBookingPayment(payment, paymentId, eventId);
      } else {
        await this.activateSubscriptionFromPayment(payment.id, paymentId, eventId);
      }
    }

    // Handle payment.failed
    if (eventType === 'payment.failed') {
      const paymentEntity = event.payload?.payment?.entity;
      const orderId = paymentEntity?.order_id;

      if (orderId) {
        const payment = await Payment.findOne({ razorpayOrderId: orderId });
        if (payment && !payment.rawWebhookEventIds.includes(eventId)) {
          payment.rawWebhookEventIds.push(eventId);
          payment.status = 'FAILED';
          await payment.save();

          await Notification.create({
            userId: payment.userId,
            title: 'Payment Failed',
            body: 'Your payment attempt was unsuccessful. Please retry or use a different payment method.',
            type: 'SYSTEM',
          });
        }
      }
    }

    // Handle refund.processed
    if (eventType === 'refund.processed') {
      const refundEntity = event.payload?.refund?.entity;
      const paymentId = refundEntity?.payment_id;

      if (paymentId) {
        const payment = await Payment.findOne({ razorpayPaymentId: paymentId });
        if (payment && !payment.rawWebhookEventIds.includes(eventId)) {
          payment.rawWebhookEventIds.push(eventId);
          payment.status = 'REFUNDED';
          payment.refundId = refundEntity?.id;
          await payment.save();

          // Cancel active subscription associated with refunded payment
          await Subscription.updateOne(
            { paymentId: payment._id, status: 'ACTIVE' },
            { status: 'CANCELLED' },
          );
        }
      }
    }

    return { received: true };
  }

  /**
   * Fulfills subscription upon confirmed payment.
   * If existing active subscription exists, extends the duration from current endsAt.
   */
  async fulfillSubscription(payment: IPayment, plan: IPlan): Promise<any> {
    const userId = payment.userId;
    const now = new Date();

    // Check for existing active subscriptions to extend
    const existingSubs = await Subscription.find({
      userId,
      status: 'ACTIVE',
      $or: [{ endsAt: { $gt: now } }, { endsAt: null }],
    }).sort({ endsAt: -1 }).populate('planId');

    let existingSub = null;
    for (const sub of existingSubs) {
      if (sub.planId && (sub.planId as any).audience === plan.audience) {
        existingSub = sub;
        break;
      }
    }

    const startsAt = existingSub ? existingSub.startsAt : now;
    const baseDate = existingSub?.endsAt && existingSub.endsAt > now ? existingSub.endsAt : now;
    const endsAt = plan.durationDays === 0 ? null : new Date(baseDate.getTime() + plan.durationDays * 24 * 60 * 60 * 1000);

    if (existingSub) {
      // Extend current subscription for this audience
      existingSub.endsAt = endsAt as any;
      existingSub.paymentId = payment._id as any;
      existingSub.planId = plan._id as any;
      await existingSub.save();
    } else {
      // Brand new subscription for this audience
      await Subscription.create({
        userId,
        planId: plan._id,
        status: 'ACTIVE',
        startsAt,
        endsAt,
        paymentId: payment._id,
      });
    }

    // Generate GST invoice number if not already present
    if (!payment.invoiceNumber) {
      const count = await Payment.countDocuments({ status: 'CAPTURED' });
      payment.invoiceNumber = invoiceService.generateInvoiceNumber(count + 1);
      await payment.save();
    }

    // Update roles and activeMode based on plan audience
    const user = await User.findById(userId);
    if (user) {
      if (plan.audience === 'PARTNER' || plan.audience === 'BOTH') {
        if (!user.roles.includes('PARTNER')) {
          user.roles.push('PARTNER');
        }
        user.activeMode = 'PARTNER';
      } else if (plan.audience === 'SEEKER') {
        user.activeMode = 'SEEKER';
      }
      await User.updateOne(
        { _id: userId },
        { $set: { roles: user.roles, activeMode: user.activeMode } }
      );

      if (user.roles.includes('PARTNER')) {
        await PartnerProfile.updateOne({ userId }, { isListed: true });
      }
    }

    // Create In-App Notification
    await Notification.create({
      userId,
      title: 'Plan Activated! 🎉',
      body: `Your ${plan.name} subscription is active${endsAt ? ' until ' + endsAt.toLocaleDateString('en-IN') : ' forever'}.`,
      type: 'SYSTEM',
    });

    // Write AuditLog
    await AuditLog.create({
      actorId: userId,
      action: 'SUBSCRIPTION_ACTIVATED',
      entityType: 'Subscription',
      entityId: payment._id,
      meta: {
        planId: plan.id.toString(),
        planName: plan.name,
        amountPaise: payment.amountPaise,
        startsAt,
        endsAt,
        invoiceNumber: payment.invoiceNumber,
      },
    });

    logger.info({ userId, planName: plan.name, startsAt, endsAt }, 'Subscription fulfilled');

    const { accessService } = await import('./AccessService.js');
    await accessService.publishAccessChange(userId.toString(), 'subscription.activated');

    return existingSub || (await Subscription.findOne({ userId, paymentId: payment._id }));
  }

  /**
   * Admin-triggered refund via Razorpay API.
   */
  async refundPayment(
    adminUserId: string,
    paymentId: string,
    reason: string,
  ): Promise<{ success: boolean; refundId: string }> {
    const payment = await Payment.findById(paymentId);
    if (!payment) {
      throw new AppError('Payment not found', 404, 'PAYMENT_NOT_FOUND');
    }

    if (payment.status !== 'CAPTURED') {
      throw new AppError('Only captured payments can be refunded', 400, 'INVALID_PAYMENT_STATUS');
    }

    if (!payment.razorpayPaymentId) {
      throw new AppError('Razorpay payment ID missing', 400, 'MISSING_GATEWAY_ID');
    }

    let refundId: string;

    try {
      const refund = await this.getRazorpay().payments.refund(payment.razorpayPaymentId, {
        notes: {
          adminUserId,
          reason,
        },
      });
      refundId = refund.id;
    } catch (err) {
      if (env.NODE_ENV === 'test' || env.RAZORPAY_KEY_ID.includes('placeholder')) {
        refundId = `rfnd_mock_${crypto.randomBytes(8).toString('hex')}`;
      } else {
        logger.error({ err, paymentId }, 'Razorpay refund API failed');
        throw new AppError('Failed to process refund with gateway', 502, 'GATEWAY_ERROR');
      }
    }

    payment.status = 'REFUNDED';
    payment.refundReason = reason;
    payment.refundId = refundId;
    await payment.save();

    // Cancel active subscription
    await Subscription.updateMany(
      { paymentId: payment._id, status: 'ACTIVE' },
      { status: 'CANCELLED' },
    );

    // If partner, unlist profile
    const user = await User.findById(payment.userId);
    if (user?.roles.includes('PARTNER')) {
      await PartnerProfile.updateOne({ userId: payment.userId }, { isListed: false });
    }

    // Write AuditLog
    await AuditLog.create({
      actorId: adminUserId,
      action: 'PAYMENT_REFUNDED',
      entityType: 'Payment',
      entityId: payment._id,
      meta: {
        targetUserId: payment.userId.toString(),
        refundId,
        reason,
        amountPaise: payment.amountPaise,
      },
    });

    // Notify user
    await Notification.create({
      userId: payment.userId,
      title: 'Refund Processed',
      body: `A refund of ₹${(payment.amountPaise / 100).toFixed(2)} has been processed. Reason: ${reason}.`,
      type: 'SYSTEM',
    });

    return { success: true, refundId };
  }
}

export const paymentService = new PaymentService();
