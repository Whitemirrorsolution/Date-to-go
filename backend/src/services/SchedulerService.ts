import { logger } from '../utils/logger.js';
// Mongoose Models
import { Listing } from '../models/Listing.js';

/**
 * Background Scheduler Service
 * Consolidates all time-based state transitions and async jobs.
 * Handlers are idempotent.
 */
export class SchedulerService {

  /**
   * Run all scheduled jobs (Can be called by cron or worker loop)
   */
  async runAllJobs() {
    try {
      await this.expireRequests();
      await this.expirePaymentPending();
      await this.transitionToInProgress();
      await this.autoReleaseFunds();
      await this.expireListings();
      // Add other jobs here (KYC retention deletion, OTP expiry sweep)
    } catch (err) {
      logger.error({ err }, 'Error running scheduler jobs');
    }
  }

  /**
   * Find REQUESTED or ACCEPTED requests that have passed their expiresAt or confirmBy time
   * and mark them EXPIRED. Also re-open listings if needed.
   */
  async expireRequests() {
    // Implementation details handled in subsequent updates
  }

  /**
   * Find bookings in PAYMENT_PENDING that have passed checkout window and EXPIRE them,
   * freeing up the listing.
   */
  async expirePaymentPending() {
    // Implementation details handled in subsequent updates
  }

  /**
   * Find bookings in PAID state where startAt <= now and move to IN_PROGRESS.
   */
  async transitionToInProgress() {
    // Implementation details handled in subsequent updates
  }

  /**
   * Find bookings that are AWAITING_OTP (or partner marked service delivered)
   * where autoReleaseHours have passed without a dispute, and release funds.
   */
  async autoReleaseFunds() {
    // Implementation details handled in subsequent updates
  }

  /**
   * Move OPEN listings that have passed their startAt time to EXPIRED.
   */
  async expireListings() {
    const now = new Date();
    await Listing.updateMany(
      { status: 'OPEN', startAt: { $lt: now } },
      { $set: { status: 'EXPIRED' } }
    );
  }
}

export const schedulerService = new SchedulerService();
