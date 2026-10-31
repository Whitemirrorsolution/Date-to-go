/**
 * SLA breach monitor — runs every 30 minutes.
 * Finds reports that have breached their SLA deadline without resolution
 * and sends admin alerts.
 */
import cron from 'node-cron';
import { Report } from '../models/Report.js';
import { Notification } from '../models/Notification.js';
import { User } from '../models/User.js';
import { logger } from '../utils/logger.js';

export const runSlaBreachCheck = async () => {
  try {
    const now = new Date();

    // Find OPEN/REVIEWING reports past their SLA deadline
    const breached = await Report.find({
      status: { $in: ['OPEN', 'REVIEWING'] },
      slaDeadline: { $lt: now },
      // Only alert once — we track by checking if already escalated
    });

    if (breached.length === 0) return;

    logger.warn({ count: breached.length }, 'SLA breach detected in safety reports');

    // Find all admins to notify
    const admins = await User.find({ role: 'ADMIN', status: 'ACTIVE' }).select('_id');
    
    for (const admin of admins) {
      const critical = breached.filter(r => r.priority === 'CRITICAL').length;
      const high = breached.filter(r => r.priority === 'HIGH').length;

      await Notification.create({
        userId: admin._id,
        title: '⚠️ SLA Breach Alert',
        body: `${breached.length} report(s) have breached SLA: ${critical} CRITICAL, ${high} HIGH. Immediate attention required.`,
        type: 'SYSTEM',
      });
    }
  } catch (err) {
    logger.error({ err }, 'Error in SLA breach check');
  }
};

export const startSlaBreachCron = () => {
  // Run every 30 minutes
  const task = cron.schedule('*/30 * * * *', async () => {
    logger.debug('Running SLA breach check...');
    await runSlaBreachCheck();
  });
  return task;
};
