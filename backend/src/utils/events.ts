import { EventEmitter } from 'events';
import { logger } from './logger.js';

export const eventBus = new EventEmitter();

/**
 * Emit an application or domain event safely across the system.
 * Logs event dispatch and swallows uncaught listener exceptions to protect request flows.
 */
export function emitEvent(eventName: string, payload: Record<string, unknown>): void {
  try {
    logger.debug({ eventName, payload }, `[Event] Dispatched event: ${eventName}`);
    eventBus.emit(eventName, payload);
  } catch (err) {
    logger.error({ err, eventName }, `[Event] Error while emitting event: ${eventName}`);
  }
}
