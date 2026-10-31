import mongoose from 'mongoose';
import { Booking, type BookingStatus } from '../models/Booking.js';
import { BookingEvent } from '../models/BookingEvent.js';
import { walletService } from './WalletService.js';
import { AppError } from '../utils/AppError.js';
import { otpService } from './OtpService.js';

const ALLOWED_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  REQUESTED: ['ACCEPTED', 'DECLINED', 'CANCELLED', 'EXPIRED'],
  ACCEPTED: ['PAYMENT_PENDING', 'PAID', 'DECLINED', 'CANCELLED', 'EXPIRED'],
  PAYMENT_PENDING: ['PAID', 'CANCELLED', 'EXPIRED'],
  PAID: ['IN_PROGRESS', 'AWAITING_OTP', 'CANCELLED', 'DISPUTED'],
  IN_PROGRESS: ['AWAITING_OTP', 'COMPLETED', 'CANCELLED', 'DISPUTED'],
  AWAITING_OTP: ['COMPLETED', 'DISPUTED'],
  COMPLETED: [],
  DECLINED: [],
  CANCELLED: [],
  EXPIRED: [],
  DISPUTED: ['COMPLETED', 'CANCELLED', 'REFUNDED'],
  REFUNDED: [],
};

export const bookingLifecycleService = {
  /**
   * Internal helper to record the transition event and update booking status.
   * MUST be called within a MongoDB transaction.
   */
  async transitionStatus(
    bookingId: string,
    newStatus: BookingStatus,
    actorId: string,
    actorModel: 'User' | 'Admin',
    session: mongoose.mongo.ClientSession,
    reason?: string
  ): Promise<void> {
    const booking = await Booking.findById(bookingId).session(session);
    if (!booking) throw new AppError('Booking not found', 404, 'NOT_FOUND');

    if (!ALLOWED_TRANSITIONS[booking.stage].includes(newStatus)) {
      throw new AppError(`Cannot transition from ${booking.stage} to ${newStatus}`, 400, 'INVALID_TRANSITION');
    }

    booking.stage = newStatus;
    if (reason) booking.cancelReason = reason;

    await booking.save({ session });

    await BookingEvent.create([{
      bookingId: booking._id,
      status: newStatus,
      actorId,
      actorModel,
      reason
    }], { session });

    // Additional side-effects could go here (e.g. notifications)
  },

  /**
   * Partner accepts the booking request.
   */
  async acceptBooking(bookingId: string, partnerId: string): Promise<any> {
    let updatedBooking;
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        const booking = await Booking.findOne({ _id: bookingId, partnerId }).session(session);
        if (!booking) throw new AppError('Booking not found', 404);

        await this.transitionStatus(bookingId, 'ACCEPTED', partnerId, 'User', session);
        updatedBooking = await Booking.findById(bookingId).session(session);
      });
    } finally {
      await session.endSession();
    }
    return updatedBooking;
  },

  /**
   * Partner declines the booking request.
   */
  async declineBooking(bookingId: string, partnerId: string, reason: string): Promise<any> {
    let updatedBooking;
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        const booking = await Booking.findOne({ _id: bookingId, partnerId }).session(session);
        if (!booking) throw new AppError('Booking not found', 404);

        await this.transitionStatus(bookingId, 'DECLINED', partnerId, 'User', session, reason);
        updatedBooking = await Booking.findById(bookingId).session(session);
      });
    } finally {
      await session.endSession();
    }
    return updatedBooking;
  },

  /**
   * Start check-in for the booking (requires 4 digit code).
   */
  async checkIn(bookingId: string, partnerId: string, code: string): Promise<void> {
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        const booking = await Booking.findOne({ _id: bookingId, partnerId }).session(session);
        if (!booking) throw new AppError('Booking not found', 404);

        if (booking.otpLockoutUntil && booking.otpLockoutUntil > new Date()) {
          throw new AppError('Check-in locked due to too many failed attempts', 429, 'LOCKOUT');
        }

        if (
          !booking.otpHash ||
          !booking.otpExpiresAt ||
          booking.otpExpiresAt <= new Date() ||
          !otpService.verifyOtp(code, bookingId, booking.otpHash)
        ) {
          booking.otpAttempts += 1;
          if (booking.otpAttempts >= 5) {
            booking.otpLockoutUntil = new Date(Date.now() + 15 * 60 * 1000);
          }
          await booking.save({ session });
          throw new AppError('Invalid check-in code', 400, 'INVALID_CODE');
        }

        if (booking.stage !== 'AWAITING_OTP') {
          throw new AppError('Booking is not awaiting completion confirmation', 400);
        }

        booking.otpAttempts = 0;
        delete booking.otpHash;
        delete booking.otpExpiresAt;
        delete booking.otpLockoutUntil;
        await booking.save({ session });

        await this.transitionStatus(bookingId, 'COMPLETED', partnerId, 'User', session);
        await walletService.processTransaction(
          booking.partnerId,
          'CREDIT',
          booking.partnerNetPaise,
          `Earnings for completed booking: ${bookingId}`,
          'BOOKING',
          bookingId,
        );
      });
    } finally {
      await session.endSession();
    }
  },

  /**
   * Cancel booking with refund math based on time.
   */
  async cancelBooking(bookingId: string, actorId: string, actorModel: 'User' | 'Admin', reason: string): Promise<void> {
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        const booking = await Booking.findById(bookingId).session(session);
        if (!booking) throw new AppError('Booking not found', 404);

        const isClient = booking.clientId.toString() === actorId;
        const previousStage = booking.stage;

        await this.transitionStatus(bookingId, 'CANCELLED', actorId, actorModel, session, reason);

        if (previousStage === 'PAID' || previousStage === 'PAYMENT_PENDING') {
          let refundPaise = booking.totalPaise;
          if (isClient) {
            const hoursToStart = (booking.startAt.getTime() - Date.now()) / (1000 * 60 * 60);
            if (hoursToStart < 24) refundPaise = 0;
            else if (hoursToStart < 48) refundPaise = Math.floor(booking.totalPaise * 0.5);
          }

          if (refundPaise > 0 && previousStage === 'PAID') {
            await walletService.processTransaction(
              booking.clientId,
              'REFUND',
              refundPaise,
              `Refund for cancelled booking: ${bookingId}`,
              'BOOKING',
              bookingId,
            );
          }
        }
      });
    } finally {
      await session.endSession();
    }
  },

  /**
   * Confirm booking payment.
   */
  async confirmPayment(bookingId: string, actorId: string): Promise<void> {
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        const booking = await Booking.findById(bookingId).session(session);
        if (!booking) throw new AppError('Booking not found', 404);

        await this.transitionStatus(bookingId, 'PAID', actorId, 'User', session);
      });
    } finally {
      await session.endSession();
    }
  },

  /**
   * Complete booking (end time + grace). Can be called by partner or auto-job.
   */
  async completeBooking(bookingId: string, actorId: string, actorModel: 'User' | 'Admin'): Promise<any> {
    let updatedBooking;
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        const booking = await Booking.findById(bookingId).session(session);
        if (!booking) throw new AppError('Booking not found', 404);

        await this.transitionStatus(bookingId, 'COMPLETED', actorId, actorModel, session);

        // Credit the partner's wallet (total minus platform fee)
        const earningPaise = booking.partnerNetPaise;
        await walletService.processTransaction(
          booking.partnerId.toString(),
          'CREDIT',
          earningPaise,
          `Earnings for completed booking: ${bookingId}`,
          'BOOKING',
          bookingId
        );

        updatedBooking = await Booking.findById(bookingId).session(session);
      });
    } finally {
      await session.endSession();
    }
    return updatedBooking;
  }
};
