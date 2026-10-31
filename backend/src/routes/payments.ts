/**
 * Payment routes — /api/v1/payments
 *
 * Auth:    POST /plan/order          — Create Razorpay order for plan
 *          POST /verify              — Verify client signature & fulfill
 *          GET  /status/:orderId     — Poll payment status (for frontend checkout)
 *          GET  /history             — Get user's payment history
 *          GET  /subscription        — Get active subscription details
 *          GET  /invoices/:paymentId — Get invoice details
 *          GET  /invoices/:paymentId/pdf — Download PDF invoice
 * Public:  POST /webhook             — Razorpay webhook listener (HMAC signature)
 * Admin:   POST /refund              — Process payment refund
 */
import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler.js';
import { paymentService } from '../services/PaymentService.js';
import { invoiceService } from '../services/InvoiceService.js';
import { requireAuth, requireRole } from '../middlewares/auth.js';
import { Payment } from '../models/Payment.js';
import { Plan } from '../models/Plan.js';
import { Subscription } from '../models/Subscription.js';
import { User } from '../models/User.js';
import { AppError } from '../utils/AppError.js';

const router: Router = Router();

// ── Validation schemas ─────────────────────────────────────────────────────

const CreateOrderSchema = z.object({
  planId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid planId'),
});

const VerifyPaymentSchema = z.object({
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
});

const RefundSchema = z.object({
  paymentId: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid paymentId'),
  reason: z.string().min(3).max(500),
});

// ── GET /config — Get payment gateway config ────────────────────────────────

router.get(
  '/config',
  requireAuth,
  (_req: Request, res: Response) => {
    res.status(200).json({
      success: true,
      data: {
        keyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_dummy',
      },
    });
  }
);

// ── POST /plan/order — Create order for plan ───────────────────────────────

router.post(
  '/plan/order',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const { planId } = CreateOrderSchema.parse(req.body);
    const result = await paymentService.createPlanOrder(req.user!.id, planId);

    res.status(201).json({
      success: true,
      data: result,
    });
  }),
);

// ── POST /verify — Client signature verification ───────────────────────────

router.post(
  '/verify',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
      VerifyPaymentSchema.parse(req.body);

    const result = await paymentService.verifyAndFulfill(
      req.user!.id,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    );

    res.status(200).json({
      success: true,
      message: 'Payment verified and subscription activated',
      data: result,
    });
  }),
);

// ── POST /webhook — Razorpay webhook ───────────────────────────────────────

router.post(
  '/webhook',
  asyncHandler(async (req: Request, res: Response) => {
    const signature = (req.headers['x-razorpay-signature'] as string) || '';
    // req.body can be Buffer (if raw parser used) or object
    const rawBody = (req as unknown as { rawBody?: Buffer }).rawBody || JSON.stringify(req.body);

    await paymentService.handleWebhook(rawBody, signature);

    res.status(200).json({ status: 'ok' });
  }),
);

// ── GET /status/:orderId — Poll order status ───────────────────────────────

router.get(
  '/status/:orderId',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const payment = await Payment.findOne({
      razorpayOrderId: req.params['orderId'],
      userId: req.user!.id,
    }).populate('planId');

    if (!payment) {
      throw new AppError('Payment not found', 404, 'PAYMENT_NOT_FOUND');
    }

    const subscription = await Subscription.findOne({ paymentId: payment._id });

    res.status(200).json({
      success: true,
      data: {
        status: payment.status,
        razorpayOrderId: payment.razorpayOrderId,
        razorpayPaymentId: payment.razorpayPaymentId,
        amountPaise: payment.amountPaise,
        invoiceNumber: payment.invoiceNumber,
        isFulfilled: payment.status === 'CAPTURED' && Boolean(subscription),
        subscriptionId: subscription?.id,
      },
    });
  }),
);

// ── GET /subscription — Current user subscription ──────────────────────────

router.get(
  '/subscription',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const now = new Date();
    const subscription = await Subscription.findOne({
      userId: req.user!.id,
      status: 'ACTIVE',
      $or: [{ endsAt: { $gt: now } }, { endsAt: null }],
    })
      .populate('planId')
      .sort({ endsAt: -1 });

    const latestAnySub = await Subscription.findOne({ userId: req.user!.id })
      .populate('planId')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: {
        active: Boolean(subscription),
        currentSubscription: subscription,
        latestSubscription: latestAnySub,
      },
    });
  }),
);

// ── GET /history — User's payment history ──────────────────────────────────

router.get(
  '/history',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const payments = await Payment.find({ userId: req.user!.id })
      .populate('planId')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: payments,
    });
  }),
);

// ── GET /invoices/:paymentId — Invoice details ─────────────────────────────

router.get(
  '/invoices/:paymentId',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const payment = await Payment.findById(req.params['paymentId']);
    if (!payment) {
      throw new AppError('Payment not found', 404, 'PAYMENT_NOT_FOUND');
    }

    // Must be payment owner or admin
    if (payment.userId.toString() !== req.user!.id && !req.user!.roles.includes('ADMIN')) {
      throw new AppError('Unauthorized to view this invoice', 403, 'FORBIDDEN');
    }

    const user = await User.findById(payment.userId);
    const plan = await Plan.findById(payment.planId);

    if (!user || !plan) {
      throw new AppError('Associated user or plan not found', 404, 'NOT_FOUND');
    }

    const invoiceData = invoiceService.buildInvoiceData(user, plan, payment);

    res.status(200).json({
      success: true,
      data: invoiceData,
    });
  }),
);

// ── GET /invoices/:paymentId/pdf — Download PDF Invoice ─────────────────────

router.get(
  '/invoices/:paymentId/pdf',
  requireAuth,
  asyncHandler(async (req: Request, res: Response) => {
    const payment = await Payment.findById(req.params['paymentId']);
    if (!payment) {
      throw new AppError('Payment not found', 404, 'PAYMENT_NOT_FOUND');
    }

    if (payment.userId.toString() !== req.user!.id && !req.user!.roles.includes('ADMIN')) {
      throw new AppError('Unauthorized to download this invoice', 403, 'FORBIDDEN');
    }

    const user = await User.findById(payment.userId);
    const plan = await Plan.findById(payment.planId);

    if (!user || !plan) {
      throw new AppError('Associated user or plan not found', 404, 'NOT_FOUND');
    }

    const invoiceData = invoiceService.buildInvoiceData(user, plan, payment);
    const pdfBuffer = invoiceService.generatePdfBuffer(invoiceData);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${invoiceData.invoiceNumber}.pdf"`,
    );
    res.status(200).send(pdfBuffer);
  }),
);

// ── POST /refund — Process refund (Admin only) ─────────────────────────────

router.post(
  '/refund',
  requireAuth,
  requireRole('ADMIN'),
  asyncHandler(async (req: Request, res: Response) => {
    const { paymentId, reason } = RefundSchema.parse(req.body);
    const result = await paymentService.refundPayment(req.user!.id, paymentId, reason);

    res.status(200).json({
      success: true,
      message: 'Refund processed successfully',
      data: result,
    });
  }),
);

export default router;
