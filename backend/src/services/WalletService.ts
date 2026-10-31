import mongoose from 'mongoose';
import { AppError } from '../utils/AppError.js';
import { User } from '../models/User.js';
import { WalletLedger, type LedgerEntryType } from '../models/WalletLedger.js';
import Razorpay from 'razorpay';
import crypto from 'crypto';
import { env } from '../config/env.js';

export class WalletService {
  /**
   * Adds an entry to the wallet ledger transactionally.
   * amountPaise is positive for credit/refund, negative for debit.
   */
  async processTransaction(
    userId: string | mongoose.Types.ObjectId,
    type: LedgerEntryType,
    amountPaise: number,
    reason: string,
    refType: string,
    refId?: string
  ): Promise<{ balanceAfterPaise: number; ledgerId: mongoose.Types.ObjectId }> {
    // Basic validation
    if (amountPaise === 0) {
      throw new AppError('Transaction amount cannot be zero', 400, 'INVALID_AMOUNT');
    }
    if ((type === 'CREDIT' || type === 'REFUND') && amountPaise < 0) {
      throw new AppError('Credits must be positive', 400, 'INVALID_AMOUNT');
    }
    if (type === 'DEBIT' && amountPaise > 0) {
      throw new AppError('Debits must be negative', 400, 'INVALID_AMOUNT');
    }

    const session = await mongoose.startSession();
    let balanceAfterPaise = 0;
    let ledgerId = new mongoose.Types.ObjectId();

    try {
      await session.withTransaction(async () => {
        // Find user and lock the document for this transaction
        const user = await User.findById(userId).session(session).select('walletBalancePaise');
        if (!user) {
          throw new AppError('User not found', 404, 'NOT_FOUND');
        }

        const newBalance = user.walletBalancePaise + amountPaise;
        if (newBalance < 0) {
          throw new AppError('Insufficient wallet balance', 402, 'INSUFFICIENT_BALANCE');
        }

        // Update user balance
        user.walletBalancePaise = newBalance;
        await user.save({ session });
        balanceAfterPaise = newBalance;

        // Create ledger entry
        const [ledger] = await WalletLedger.create(
          [
            {
              _id: ledgerId,
              userId: user._id,
              type,
              amountPaise,
              balanceAfterPaise: newBalance,
              reason,
              refType,
              refId,
            },
          ],
          { session }
        );
        ledgerId = ledger._id as mongoose.Types.ObjectId;
      });
    } finally {
      await session.endSession();
    }

    return { balanceAfterPaise, ledgerId };
  }

  async getBalance(userId: string): Promise<number> {
    const user = await User.findById(userId).select('walletBalancePaise');
    if (!user) throw new AppError('User not found', 404, 'NOT_FOUND');
    return user.walletBalancePaise;
  }

  async getLedger(userId: string, limit = 50, skip = 0) {
    const records = await WalletLedger.find({ userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
    
    const total = await WalletLedger.countDocuments({ userId });
    return { records, total };
  }

  /**
   * Creates a Razorpay order for a wallet topup.
   */
  async createTopupOrder(userId: string, amountPaise: number): Promise<{ id: string; amount: number; currency: string }> {
    if (amountPaise < 10000) { // minimum Rs. 100
      throw new AppError('Minimum topup amount is Rs. 100', 400, 'MIN_TOPUP_REQUIRED');
    }

    const rzp = new Razorpay({
      key_id: env.RAZORPAY_KEY_ID,
      key_secret: env.RAZORPAY_KEY_SECRET,
    });

    const receipt = `tp_${Date.now().toString(36)}`;
    const order = await rzp.orders.create({
      amount: amountPaise,
      currency: 'INR',
      receipt,
      notes: {
        userId: userId.toString(),
        type: 'WALLET_TOPUP',
      },
    });

    return {
      id: order.id,
      amount: Number(order.amount),
      currency: order.currency,
    };
  }

  /**
   * Verifies Razorpay signature and idempotently credits the wallet.
   */
  async verifyAndCredit(paymentId: string, orderId: string, signature: string, amountPaise: number, userId: string): Promise<void> {
    const body = orderId + '|' + paymentId;
    const expectedSignature = crypto
      .createHmac('sha256', env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest('hex');

    if (expectedSignature !== signature) {
      throw new AppError('Invalid payment signature', 400, 'INVALID_SIGNATURE');
    }

    // Check if this payment was already credited (idempotency check by refId)
    const existing = await WalletLedger.findOne({ refId: paymentId, type: 'CREDIT', refType: 'RAZORPAY' });
    if (existing) {
      return; // Already processed
    }

    await this.processTransaction(
      userId,
      'CREDIT',
      amountPaise,
      'Wallet Top-up via Razorpay',
      'RAZORPAY',
      paymentId
    );
  }
}

export const walletService = new WalletService();
