import { describe, it, expect, vi, beforeEach } from 'vitest';
import { requireFeatureFlag } from '../src/middlewares/featureFlag.js';
import { AppSetting } from '../src/models/AppSetting.js';
import { emitEvent, eventBus } from '../src/utils/events.js';

describe('Phase 3: Favorites and Feature Flag tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('Feature Flag Middleware (seeker.favorites)', () => {
    it('returns 403 when seeker.favorites feature flag is not enabled', async () => {
      vi.spyOn(AppSetting, 'findOne').mockResolvedValueOnce({
        key: 'seeker.favorites',
        value: { enabled: false },
      } as any);

      const middleware = requireFeatureFlag('seeker.favorites');
      const req: any = {};
      const statusJson = vi.fn();
      const res: any = {
        status: vi.fn().mockReturnValue({ json: statusJson }),
      };
      const next = vi.fn();

      await middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(statusJson).toHaveBeenCalledWith({
        success: false,
        message: 'Feature seeker.favorites not enabled',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('calls next() when seeker.favorites flag is enabled', async () => {
      vi.spyOn(AppSetting, 'findOne').mockResolvedValueOnce({
        key: 'seeker.favorites',
        value: { enabled: true },
      } as any);

      const middleware = requireFeatureFlag('seeker.favorites');
      const req: any = {};
      const res: any = {};
      const next = vi.fn();

      await middleware(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
    });
  });

  describe('Events Dispatcher', () => {
    it('dispatches favorite.added event through eventBus without throwing', () => {
      const listener = vi.fn();
      eventBus.on('favorite.added', listener);

      emitEvent('favorite.added', { seekerId: 'seeker-123', partnerId: 'partner-456' });

      expect(listener).toHaveBeenCalledWith({
        seekerId: 'seeker-123',
        partnerId: 'partner-456',
      });
    });

    it('dispatches favorite.removed event cleanly', () => {
      const listener = vi.fn();
      eventBus.on('favorite.removed', listener);

      emitEvent('favorite.removed', { seekerId: 'seeker-123', partnerId: 'partner-456' });

      expect(listener).toHaveBeenCalledWith({
        seekerId: 'seeker-123',
        partnerId: 'partner-456',
      });
    });
  });
});
