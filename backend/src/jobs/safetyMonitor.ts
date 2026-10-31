
import { Booking } from '../models/Booking.js';
import { SafetyCheck } from '../models/SafetyCheck.js';
import { Notification } from '../models/Notification.js';
import { logger } from '../utils/logger.js';

export const runSafetyMonitor = async () => {
  try {
    const now = new Date();
    
    // 1. Find IN_PROGRESS bookings where end time has passed by > 5 mins (grace period)
    const gracePeriodEnds = new Date(now.getTime() - 5 * 60 * 1000);
    
    // Aggregate to find bookings that don't already have a SafetyCheck
    const overdueBookings = await Booking.aggregate([
      { 
        $match: { 
          status: 'IN_PROGRESS', 
          endAt: { $lt: gracePeriodEnds } 
        } 
      },
      {
        $lookup: {
          from: 'safetychecks',
          localField: '_id',
          foreignField: 'bookingId',
          as: 'checks'
        }
      },
      {
        $match: {
          'checks.0': { $exists: false } // No safety checks exist for this booking
        }
      }
    ]);

    for (const b of overdueBookings) {
      await SafetyCheck.create({
        bookingId: b._id,
        status: 'PENDING',
        triggeredBy: 'SYSTEM',
      });

      // Notify both parties
      await Notification.create([
        {
          userId: b.userId,
          title: 'Safety Check 🛡️',
          body: 'Your booking scheduled time has ended. Please confirm you are safe and check out, or tap here for assistance.',
          type: 'SAFETY',
        },
        {
          userId: b.partnerId,
          title: 'Safety Check 🛡️',
          body: 'Your booking scheduled time has ended. Please mark the booking as completed, or tap here for assistance.',
          type: 'SAFETY',
        }
      ]);
      
      logger.info(`Created system safety check for booking ${b._id}`);
    }

    // 2. Find PENDING safety checks older than 10 minutes and ESCALATE them
    const escalationTime = new Date(now.getTime() - 10 * 60 * 1000);
    
    const pendingToEscalate = await SafetyCheck.find({
      status: 'PENDING',
      createdAt: { $lt: escalationTime },
    });

    for (const check of pendingToEscalate) {
      check.status = 'ESCALATED';
      await check.save();
      
      logger.warn(`Safety check ${check._id} escalated to ADMIN due to no response`);
      
      // Could notify admin channel here if we have one
    }

  } catch (error) {
    logger.error({ err: error instanceof Error ? error : new Error(String(error)) }, 'Error in safety monitor job');
  }
};

import cron from 'node-cron';

export const startSafetyMonitorCron = () => {
  // Run every 1 minute
  const task = cron.schedule('* * * * *', async () => {
    logger.debug('Running safety monitor cron job...');
    await runSafetyMonitor();
  });
  
  return task;
};
