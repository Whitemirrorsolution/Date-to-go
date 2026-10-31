/**
 * Subscription Expiry Cron Job.
 *
 * Rules:
 * 1. Checks every hour (or scheduled daily) for subscriptions where status === 'ACTIVE' and endsAt <= now.
 * 2. Marks them EXPIRED.
 * 3. If the user is a PARTNER, unlists them (isListed = false).
 * 4. Checks for subscriptions expiring in the next 3 days and sends reminder notifications/emails.
 */
import cron from 'node-cron';
import { Subscription } from '../models/Subscription.js';
import { PartnerProfile } from '../models/PartnerProfile.js';
import { User } from '../models/User.js';
import { Notification } from '../models/Notification.js';
import { logger } from '../utils/logger.js';

export async function processExpiredSubscriptions(): Promise<{ expiredCount: number; unlistedCount: number }> {
  const now = new Date();

  // Find all ACTIVE subscriptions that have passed endsAt
  const expiredSubs = await Subscription.find({
    status: 'ACTIVE',
    endsAt: { $lte: now },
  });

  let unlistedCount = 0;

  for (const sub of expiredSubs) {
    sub.status = 'EXPIRED';
    await sub.save();

    // Check if user is a partner — unlist their profile
    const user = await User.findById(sub.userId);
    if (user?.roles.includes('PARTNER')) {
      await PartnerProfile.updateOne({ userId: sub.userId }, { isListed: false });
      unlistedCount++;
    }

    // Send expiry notification
    await Notification.create({
      userId: sub.userId,
      title: 'Subscription Expired',
      body: 'Your subscription plan has expired. Please renew to keep using all features.',
      type: 'SYSTEM',
    });
  }

  if (expiredSubs.length > 0) {
    logger.info(
      { expiredCount: expiredSubs.length, unlistedCount },
      'Expired subscriptions processed',
    );
  }

  return { expiredCount: expiredSubs.length, unlistedCount };
}

export async function processExpiryReminders(): Promise<{ remindersSent: number }> {
  const now = new Date();
  const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

  // Subscriptions expiring between now and 3 days from now
  const expiringSoon = await Subscription.find({
    status: 'ACTIVE',
    endsAt: { $gt: now, $lte: threeDaysFromNow },
  }).populate('planId');

  let remindersSent = 0;

  for (const sub of expiringSoon) {
    // Check if reminder was already created in last 24h
    const existingNotification = await Notification.findOne({
      userId: sub.userId,
      title: 'Plan Expiring Soon ⏰',
      createdAt: { $gte: new Date(now.getTime() - 24 * 60 * 60 * 1000) },
    });

    if (!existingNotification) {
      const daysLeft = Math.max(1, Math.ceil((sub.endsAt!.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)));
      await Notification.create({
        userId: sub.userId,
        title: 'Plan Expiring Soon ⏰',
        body: `Your subscription plan will expire in ${daysLeft} day${daysLeft > 1 ? 's' : ''}. Renew now to avoid interruption.`,
        type: 'SYSTEM',
      });
      remindersSent++;
    }
  }

  if (remindersSent > 0) {
    logger.info({ remindersSent }, 'Expiry reminder notifications sent');
  }

  return { remindersSent };
}

/**
 * Starts the recurring cron scheduler.
 * Runs at the top of every hour (0 * * * *).
 */
export function startSubscriptionExpiryCron(): cron.ScheduledTask {
  logger.info('Starting subscription expiry cron job (0 * * * *)');

  return cron.schedule('0 * * * *', async () => {
    try {
      await processExpiredSubscriptions();
      await processExpiryReminders();
    } catch (err) {
      logger.error({ err }, 'Error running subscription expiry cron job');
    }
  });
}
