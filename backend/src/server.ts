import { createApp } from './app.js';
import { Server as SocketIOServer } from 'socket.io';
import { connectDB, disconnectDB } from './config/database.js';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import { startSubscriptionExpiryCron } from './jobs/subscriptionExpiry.js';
import { startSafetyMonitorCron } from './jobs/safetyMonitor.js';
import { startSlaBreachCron } from './jobs/slaBreachMonitor.js';
import { startChatRetentionCron } from './jobs/chatRetention.js';
import { ensureDeckDefaults } from './utils/initDeckSettings.js';

async function bootstrap(): Promise<void> {
  // Connect to MongoDB before starting the HTTP server
  await connectDB();
  await ensureDeckDefaults();

  // Start background cron jobs (only in non-test env)
  let cronTask: { stop(): void } | null = null;
  let safetyCronTask: { stop(): void } | null = null;
  let slaCronTask: { stop(): void } | null = null;
  let chatRetentionCronTask: { stop(): void } | null = null;
  if (env.NODE_ENV !== 'test') {
    cronTask = startSubscriptionExpiryCron();
    safetyCronTask = startSafetyMonitorCron();
    slaCronTask = startSlaBreachCron();
    chatRetentionCronTask = startChatRetentionCron();
  }

  const app = createApp();

  const server = app.listen(env.PORT, () => {
    logger.info(
      {
        port: env.PORT,
        env: env.NODE_ENV,
        apiVersion: env.API_VERSION,
      },
      `🚀 ${env.APP_NAME} API listening on port ${env.PORT}`,
    );
  });

  // Initialize Socket.io
  const io = new SocketIOServer(server, {
    cors: {
      origin: '*', // Allow all origins for dev
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket) => {
    logger.info(`Socket connected: ${socket.id}`);

    // Join a room specifically for a booking ID
    socket.on('join_booking_chat', (bookingId: string) => {
      socket.join(`booking_${bookingId}`);
      logger.info(`Socket ${socket.id} joined room booking_${bookingId}`);
    });

    // Handle new messages
    socket.on('send_message', async (data: { _id?: string; bookingId: string; text: string; senderId: string; senderRole: string }) => {
      // Broadcast to other participants in the room (do NOT echo back to sender)
      socket.to(`booking_${data.bookingId}`).emit('receive_message', {
        ...data,
        timestamp: new Date().toISOString(),
      });
      // Also persist to MongoDB Message collection if valid ID provided
      try {
        const { Message } = await import('./models/Message.js');
        if (data._id && !data._id.startsWith('temp_')) {
          const exists = await Message.findById(data._id);
          if (!exists) {
            await Message.create({
              _id: data._id,
              bookingId: data.bookingId,
              senderId: data.senderId,
              text: data.text,
              flagged: false,
            });
          }
        }
      } catch (err) {
        logger.error({ err }, 'Failed to persist socket message');
      }
    });

    // Handle edit and delete broadcasts
    socket.on('edit_message', (data: { bookingId: string; messageId: string; text: string }) => {
      socket.to(`booking_${data.bookingId}`).emit('message_edited', data);
    });

    socket.on('delete_message', (data: { bookingId: string; messageId: string }) => {
      socket.to(`booking_${data.bookingId}`).emit('message_deleted', data);
    });

    socket.on('disconnect', () => {
      logger.info(`Socket disconnected: ${socket.id}`);
    });
  });

  // Relay domain chat.message events to Socket.io room subscribers
  const { eventBus } = await import('./utils/events.js');
  eventBus.on('chat.message', (data: any) => {
    if (data?.bookingId) {
      io.to(`booking_${data.bookingId}`).emit('receive_message', data);
      io.to(`booking_${data.bookingId}`).emit('chat.message', data);
    }
  });

  // ── Graceful shutdown ────────────────────────────────────────────────────
  const shutdown = async (signal: string): Promise<void> => {
    logger.info({ signal }, 'Shutdown signal received');

    if (cronTask) {
      cronTask.stop();
      logger.info('Subscription cron job stopped');
    }
    
    if (safetyCronTask) {
      safetyCronTask.stop();
      logger.info('Safety cron job stopped');
    }

    if (slaCronTask) {
      slaCronTask.stop();
      logger.info('SLA cron job stopped');
    }

    if (chatRetentionCronTask) {
      chatRetentionCronTask.stop();
      logger.info('Chat retention cron job stopped');
    }

    server.close(async () => {
      logger.info('HTTP server closed');
      await disconnectDB();
      logger.info('Goodbye 👋');
      process.exit(0);
    });

    // Force exit if graceful shutdown takes too long
    setTimeout(() => {
      logger.error('Forced exit after timeout');
      process.exit(1);
    }, 10_000);
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));

  // ── Unhandled errors ────────────────────────────────────────────────────
  process.on('unhandledRejection', (reason) => {
    logger.fatal({ reason }, 'Unhandled promise rejection');
    process.exit(1);
  });

  process.on('uncaughtException', (err) => {
    logger.fatal({ err }, 'Uncaught exception');
    process.exit(1);
  });
}

bootstrap().catch((err: unknown) => {
  logger.fatal({ err }, 'Failed to start server');
  process.exit(1);
});
