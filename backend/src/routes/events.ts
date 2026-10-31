import { Router, Request, Response } from 'express';
import { requireAuth } from '../middlewares/auth.js';
import { accessEventEmitter } from '../services/AccessService.js';
import { logger } from '../utils/logger.js';

const router: Router = Router();

// ── GET /events ───────────────────────────────────────────────────────────
// Server-Sent Events stream for real-time access changes

router.get('/', requireAuth, (req: Request, res: Response) => {
  const userId = req.user!.id;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable NGINX buffering

  // Send an initial heartbeat
  res.write(`event: connected\ndata: ${JSON.stringify({ timestamp: new Date() })}\n\n`);

  const heartbeatInterval = setInterval(() => {
    res.write(':\n\n'); // SSE comment as heartbeat
  }, 25000);

  const eventListener = (payload: any) => {
    res.write(`event: ${payload.type}\ndata: ${JSON.stringify(payload)}\n\n`);
  };

  const eventName = `access.changed:${userId}`;
  accessEventEmitter.on(eventName, eventListener);

  req.on('close', () => {
    clearInterval(heartbeatInterval);
    accessEventEmitter.removeListener(eventName, eventListener);
    logger.debug({ userId }, 'SSE connection closed');
  });
});

export default router;
