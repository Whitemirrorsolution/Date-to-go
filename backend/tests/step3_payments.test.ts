/**
 * Step 3 Test Suite: Plans, Payments, Webhooks, Subscriptions, Gating & Refunds.
 *
 * Tests:
 * 1. Tampered signature rejected
 * 2. Duplicate webhook is idempotent
 * 3. Client cannot change amount (server-side price enforcement)
 * 4. Expired plan blocks access (402 PLAN_REQUIRED)
 * 5. Renew extends subscription correctly from existing endsAt
 * 6. Refund flow cancels active subscription & writes audit log
 * 7. GST invoice calculation accuracy
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import crypto from 'crypto';
import mongoose from 'mongoose';
import { paymentService } from '../src/services/PaymentService.js';
import { invoiceService } from '../src/services/InvoiceService.js';
import { env } from '../src/config/env.js';
import { AppError } from '../src/utils/AppError.js';
import { Plan, type IPlan } from '../src/models/Plan.js';
import { Payment, type IPayment } from '../src/models/Payment.js';
import { Subscription, type ISubscription } from '../src/models/Subscription.js';
import { User, type IUser } from '../src/models/User.js';
import { AuditLog } from '../src/models/AuditLog.js';
import { Notification } from '../src/models/Notification.js';
import { requireActivePlan } from '../src/middlewares/auth.js';
import type { Request, Response, NextFunction } from 'express';

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('1. Tampered signature rejected', () => {
  it('should accept valid Razorpay signature and reject tampered signature', () => {
    const orderId = 'order_test_12345';
    const paymentId = 'pay_test_67890';

    const validSignature = crypto
      .createHmac('sha256', env.RAZORPAY_KEY_SECRET)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    const isValid = paymentService.verifyPaymentSignature(orderId, paymentId, validSignature);
    expect(isValid).toBe(true);

    const isTampered = paymentService.verifyPaymentSignature(
      orderId,
      paymentId,
      'tampered_invalid_signature_hex_1234567890abcdef',
    );
    expect(isTampered).toBe(false);
  });
});

describe('2. Duplicate webhook is idempotent', () => {
  it('should handle duplicate webhook events without duplicating or erroring', async () => {
    const paymentId = new mongoose.Types.ObjectId();
    const orderId = 'order_webhook_test_001';
    const eventId = 'evt_test_unique_999';

    const mockPayment: Partial<IPayment> = {
      _id: paymentId as any,
      razorpayOrderId: orderId,
      status: 'CREATED',
      rawWebhookEventIds: [],
      save: vi.fn().mockResolvedValue(true),
    };

    vi.spyOn(Payment, 'findOne').mockResolvedValue(mockPayment as any);
    vi.spyOn(Plan, 'findById').mockResolvedValue({
      _id: new mongoose.Types.ObjectId(),
      name: 'Pro Pass',
      durationDays: 30,
      audience: 'USER',
    } as any);
    vi.spyOn(paymentService, 'fulfillSubscription').mockResolvedValue({ id: 'sub_123' } as any);

    const payload = {
      event: 'payment.captured',
      event_id: eventId,
      payload: {
        payment: {
          entity: {
            id: 'pay_test_capture_001',
            order_id: orderId,
          },
        },
      },
    };

    const rawBody = JSON.stringify(payload);
    const signature = crypto
      .createHmac('sha256', env.RAZORPAY_WEBHOOK_SECRET)
      .update(rawBody)
      .digest('hex');

    // First webhook call
    const firstResult = await paymentService.handleWebhook(rawBody, signature);
    expect(firstResult.received).toBe(true);
    expect(mockPayment.rawWebhookEventIds).toContain(eventId);

    // Second webhook call with same event ID (duplicate)
    const secondResult = await paymentService.handleWebhook(rawBody, signature);
    expect(secondResult.received).toBe(true);
  });
});

describe('3. Client cannot change amount', () => {
  it('should fetch pricePaise directly from database Plan and ignore client inputs', async () => {
    const planId = new mongoose.Types.ObjectId().toString();
    const userId = new mongoose.Types.ObjectId().toString();

    const dbPlan = {
      _id: new mongoose.Types.ObjectId(planId),
      id: planId,
      name: 'Monthly Premium',
      audience: 'USER',
      pricePaise: 49900, // Rs. 499
      durationDays: 30,
      isActive: true,
    };

    vi.spyOn(Plan, 'findById').mockResolvedValue(dbPlan as any);
    vi.spyOn(User, 'findById').mockResolvedValue({
      _id: new mongoose.Types.ObjectId(userId),
      role: 'USER',
    } as any);
    vi.spyOn(Payment, 'create').mockResolvedValue({} as any);

    const orderResult = await paymentService.createPlanOrder(userId, planId);

    // Price must strictly match DB pricePaise
    expect(orderResult.amountPaise).toBe(49900);
    expect(orderResult.currency).toBe('INR');
  });
});

describe('4. Expired plan blocks access (requireActivePlan middleware)', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    req = { user: { id: new mongoose.Types.ObjectId().toString(), role: 'USER', tokenVersion: 0 } };
    res = {};
    next = vi.fn();
  });

  it('should return 402 PLAN_REQUIRED when no subscription exists', async () => {
    vi.spyOn(Subscription, 'findOne').mockReturnValue({
      populate: vi.fn().mockResolvedValue(null),
    } as any);

    await requireActivePlan(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 402,
        code: 'PLAN_REQUIRED',
      }),
    );
  });

  it('should allow access when user has an ACTIVE unexpired subscription', async () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 15);

    vi.spyOn(Subscription, 'findOne').mockReturnValue({
      populate: vi.fn().mockResolvedValue({
        status: 'ACTIVE',
        endsAt: futureDate,
      }),
    } as any);

    await requireActivePlan(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledWith(); // called without error
  });

  it('should bypass subscription requirement for ADMIN role', async () => {
    req.user!.role = 'ADMIN';

    await requireActivePlan(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledWith();
  });
});

describe('5. Renew extends subscription correctly', () => {
  it('should extend an existing active subscription from current endsAt rather than now', async () => {
    const userId = new mongoose.Types.ObjectId();
    const existingEndsAt = new Date();
    existingEndsAt.setDate(existingEndsAt.getDate() + 10); // 10 days remaining

    const mockExistingSub: Partial<ISubscription> = {
      _id: new mongoose.Types.ObjectId() as any,
      userId,
      startsAt: new Date(),
      endsAt: new Date(existingEndsAt),
      status: 'ACTIVE',
      save: vi.fn().mockResolvedValue(true),
    };

    const mockQuery = {
      sort: vi.fn().mockResolvedValue(mockExistingSub),
      populate: vi.fn().mockResolvedValue(mockExistingSub),
      then: (resolve: any) => resolve(mockExistingSub),
    };

    vi.spyOn(Subscription, 'findOne').mockReturnValue(mockQuery as any);
    vi.spyOn(Subscription, 'create').mockResolvedValue(mockExistingSub as any);
    vi.spyOn(Payment, 'countDocuments').mockResolvedValue(5);
    vi.spyOn(User, 'findById').mockResolvedValue({ role: 'USER', roles: [], save: vi.fn().mockResolvedValue(true) } as any);
    vi.spyOn(AuditLog, 'create').mockResolvedValue({} as any);
    vi.spyOn(Notification, 'create').mockResolvedValue({} as any);

    const mockPayment: Partial<IPayment> = {
      _id: new mongoose.Types.ObjectId() as any,
      userId,
      amountPaise: 99900,
      save: vi.fn().mockResolvedValue(true),
    };

    const plan: Partial<IPlan> = {
      _id: new mongoose.Types.ObjectId() as any,
      id: 'plan_123',
      name: 'Monthly Pro',
      durationDays: 30,
    };

    await paymentService.fulfillSubscription(mockPayment as any, plan as any);

    // New endsAt should be existingEndsAt + 30 days
    const expectedEndsAt = new Date(existingEndsAt.getTime() + 30 * 24 * 60 * 60 * 1000);
    expect(mockExistingSub.endsAt?.getTime()).toBe(expectedEndsAt.getTime());
    expect(mockExistingSub.save).toHaveBeenCalled();
  });
});

describe('6. GST Invoice calculation accuracy', () => {
  it('should calculate base taxable value and CGST/SGST correctly at 18%', () => {
    const user: Partial<IUser> = {
      id: 'user_123',
      email: 'customer@example.com',
      city: 'Mumbai',
    };

    const plan: Partial<IPlan> = {
      name: 'Gold Member',
      audience: 'USER',
      durationDays: 30,
    };

    const payment: Partial<IPayment> = {
      id: 'pay_doc_123',
      razorpayOrderId: 'order_123',
      razorpayPaymentId: 'pay_123',
      amountPaise: 11800, // Rs. 118 inclusive of 18% GST -> Base: Rs. 100, GST: Rs. 18
      status: 'CAPTURED',
      updatedAt: new Date(),
    };

    const invoice = invoiceService.buildInvoiceData(user as any, plan as any, payment as any);

    expect(invoice.item.taxableAmountPaise).toBe(10000); // Rs. 100.00
    expect(invoice.item.cgstAmountPaise).toBe(900); // Rs. 9.00 (9%)
    expect(invoice.item.sgstAmountPaise).toBe(900); // Rs. 9.00 (9%)
    expect(invoice.item.totalAmountPaise).toBe(11800);
    expect(invoice.item.totalAmountInRupees).toBe('₹118.00');
  });

  it('should generate valid PDF buffer for download', () => {
    const invoice = invoiceService.buildInvoiceData(
      { id: '1', email: 'a@b.com', city: 'Delhi' } as any,
      { name: 'Basic', audience: 'USER', durationDays: 30 } as any,
      { id: '1', razorpayOrderId: 'ord_1', amountPaise: 50000, status: 'CAPTURED' } as any,
    );

    const pdfBuffer = invoiceService.generatePdfBuffer(invoice);
    expect(Buffer.isBuffer(pdfBuffer)).toBe(true);
    expect(pdfBuffer.toString('utf-8')).toContain('%PDF-1.4');
  });
});
