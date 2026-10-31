import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middlewares/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { PushSubscription } from '../models/PushSubscription.js';
import { env } from '../config/env.js';

export const pushRouter: Router = Router();

const SubscribeSchema = z.object({
  subscription: z.object({
    endpoint: z.string().url(),
    keys: z.object({
      p256dh: z.string(),
      auth: z.string()
    })
  }),
  userAgent: z.string().optional(),
  platform: z.string().optional()
});

// GET public VAPID key
pushRouter.get(
  '/public-key',
  requireAuth,
  (_req, res) => {
    res.status(200).json({ success: true, publicKey: env.VAPID_PUBLIC_KEY || '' });
  }
);

// POST Subscribe
pushRouter.post(
  '/subscribe',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { subscription, userAgent, platform } = SubscribeSchema.parse(req.body);
    
    // Check if subscription already exists
    let sub = await PushSubscription.findOne({ endpoint: subscription.endpoint });
    
    if (sub) {
      if (sub.userId.toString() !== req.user!.id) {
        // If it belongs to another user, update ownership (device changed hands or account swapped)
        sub.userId = req.user!.id as any;
      }
      sub.isActive = true;
      sub.lastSeenAt = new Date();
      await sub.save();
    } else {
      sub = new PushSubscription({
        userId: req.user!.id,
        endpoint: subscription.endpoint,
        keys: subscription.keys,
        userAgent,
        platform
      });
      await sub.save();
    }

    res.status(200).json({ success: true, message: 'Subscribed to push notifications' });
  })
);

// DELETE Unsubscribe
pushRouter.delete(
  '/subscribe',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { endpoint } = req.body;
    if (!endpoint) {
      res.status(400).json({ success: false, message: 'Endpoint required' });
      return;
    }
    
    await PushSubscription.findOneAndDelete({ 
      userId: req.user!.id, 
      endpoint 
    });
    
    res.status(200).json({ success: true, message: 'Unsubscribed' });
  })
);
