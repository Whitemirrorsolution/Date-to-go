import cron from 'node-cron';
import { Conversation } from '../models/Conversation.js';
import { Booking } from '../models/Booking.js';
import { Message } from '../models/Message.js';
import { Report } from '../models/Report.js';
import { Dispute } from '../models/Dispute.js';
import { AppSetting } from '../models/AppSetting.js';
import { logger } from '../utils/logger.js';

/**
 * Chat retention job:
 * 1. Transitions expired completed conversations to READ_ONLY/CLOSED after chatGraceHours (default 24h).
 * 2. Purges archived messages past retentionDays (default 90 days) unless held by active dispute or report.
 */
export async function runChatRetention(): Promise<void> {
  try {
    const graceSetting = await AppSetting.findOne({ key: 'chatGraceHours' });
    const graceHours = (graceSetting?.value as { hours?: number } | undefined)?.hours ?? 24;

    const retentionSetting = await AppSetting.findOne({ key: 'chatRetentionDays' });
    const retentionDays = (retentionSetting?.value as { days?: number } | undefined)?.days ?? 90;

    const now = new Date();
    const graceCutoff = new Date(now.getTime() - graceHours * 60 * 60 * 1000);
    const retentionCutoff = new Date(now.getTime() - retentionDays * 24 * 60 * 60 * 1000);

    // 1. Close conversations for completed bookings past grace period
    const expiredBookings = await Booking.find({
      stage: 'COMPLETED',
      endAt: { $lt: graceCutoff },
    }).select('_id');

    if (expiredBookings.length > 0) {
      const expiredBookingIds = expiredBookings.map((b) => b._id);
      const updateResult = await Conversation.updateMany(
        {
          bookingId: { $in: expiredBookingIds },
          status: { $in: ['OPEN', 'LOCKED'] },
        },
        {
          $set: { status: 'READ_ONLY', closeAt: now },
        }
      );
      if (updateResult.modifiedCount > 0) {
        logger.info(
          { count: updateResult.modifiedCount },
          '[ChatRetention] Marked completed conversations as READ_ONLY'
        );
      }
    }

    // 2. Identify active dispute/report booking IDs to exclude from message purge
    const activeReports = await Report.find({ status: { $in: ['PENDING', 'INVESTIGATING'] } }).select('bookingId');
    const activeDisputes = await Dispute.find({ status: { $in: ['OPEN', 'UNDER_REVIEW'] } }).select('bookingId');

    const heldBookingIds = new Set([
      ...activeReports.map((r) => r.bookingId?.toString()).filter(Boolean),
      ...activeDisputes.map((d) => d.bookingId?.toString()).filter(Boolean),
    ]);

    // 3. Purge messages older than retention cutoff (excluding held bookings)
    const deleteFilter: Record<string, any> = {
      createdAt: { $lt: retentionCutoff },
    };
    if (heldBookingIds.size > 0) {
      deleteFilter.bookingId = { $nin: Array.from(heldBookingIds) };
    }

    const deleteResult = await Message.deleteMany(deleteFilter);
    if (deleteResult.deletedCount > 0) {
      logger.info(
        { deletedCount: deleteResult.deletedCount },
        '[ChatRetention] Purged expired chat messages past retention period'
      );
    }
  } catch (err) {
    logger.error({ err }, '[ChatRetention] Error during chat retention run');
  }
}

export function startChatRetentionCron(): { stop(): void } {
  // Run every hour at minute 15
  const task = cron.schedule('15 * * * *', () => {
    void runChatRetention();
  });
  logger.info('[ChatRetention] Chat retention cron job scheduled (15 * * * *)');
  return task;
}
