import webPush from 'web-push';
import { PushSubscription } from '../models/PushSubscription.js';
import { env } from '../config/env.js';
import { logger } from '../utils/logger.js';

if (env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY) {
  webPush.setVapidDetails(
    env.VAPID_SUBJECT,
    env.VAPID_PUBLIC_KEY,
    env.VAPID_PRIVATE_KEY
  );
} else {
  logger.warn('Web Push VAPID keys not configured. Push notifications will be disabled.');
}

export interface PushMessagePayload {
  type: string;
  title: string;
  body: string;
  url?: string;
  tag?: string;
}

export class PushService {
  /**
   * Send a push notification to all active devices of a user
   */
  async sendToUser(userId: string, payload: PushMessagePayload): Promise<void> {
    if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) {
      logger.debug(`[Push] Skip sending to ${userId} - keys not configured`);
      return;
    }

    const subscriptions = await PushSubscription.find({ userId, isActive: true });
    
    if (subscriptions.length === 0) {
      return;
    }

    const payloadString = JSON.stringify(payload);
    
    // Web Push TTL
    // High urgency (SOS/safety) = 24h, Normal = 12h
    const ttl = payload.type === 'sos' ? 24 * 60 * 60 : 12 * 60 * 60;

    const promises = subscriptions.map(async (sub) => {
      try {
        await webPush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: sub.keys
          },
          payloadString,
          { TTL: ttl }
        );
      } catch (err: any) {
        if (err.statusCode === 404 || err.statusCode === 410) {
          // Subscription has expired or is no longer valid
          logger.info(`[Push] Removing expired subscription for ${userId}`);
          await PushSubscription.findByIdAndDelete(sub._id);
        } else {
          logger.error(`[Push] Error sending to ${userId}:`, err.message);
        }
      }
    });

    await Promise.allSettled(promises);
  }
}

export const pushService = new PushService();
