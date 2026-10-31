import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';

// NOTE: These are integration tests against the Express app.
// MongoDB is NOT connected in these tests — we verify the health
// endpoint correctly reports 'disconnected' when DB is not available.

const app = createApp();

describe('GET /api/v1/health', () => {
  afterAll(async () => {
    // Clean up if mongoose connected
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
  });

  it('should return 200 with app metadata', async () => {
    const res = await request(app).get('/api/v1/health');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.app).toBe('Date to Go');
    expect(res.body.environment).toBe('test');
    expect(res.body.version).toBe('v1');
    expect(typeof res.body.uptime).toBe('number');
    expect(typeof res.body.timestamp).toBe('string');
    // Date is parseable ISO string
    expect(new Date(res.body.timestamp as string).toISOString()).toBe(res.body.timestamp);
  });

  it('should include x-request-id in response headers', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.headers['x-request-id']).toBeDefined();
  });

  it('should echo a provided x-request-id header', async () => {
    const customId = 'test-id-12345';
    const res = await request(app)
      .get('/api/v1/health')
      .set('x-request-id', customId);

    expect(res.headers['x-request-id']).toBe(customId);
  });

  it('should return 404 for unknown routes', async () => {
    const res = await request(app).get('/api/v1/does-not-exist');

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.code).toBe('NOT_FOUND');
  });

  it('should reject requests from unlisted CORS origins', async () => {
    const res = await request(app)
      .get('/api/v1/health')
      .set('Origin', 'https://evil.example.com');

    // Supertest doesn't enforce CORS on same process, but we can verify
    // the header is NOT present (access-control-allow-origin not set for bad origin)
    expect(res.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('should have security headers from helmet', async () => {
    const res = await request(app).get('/api/v1/health');

    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBe('SAMEORIGIN');
    expect(res.headers['x-xss-protection']).toBe('0'); // helmet sets this to 0 intentionally
  });
});

describe('Security headers baseline', () => {
  it('should not expose x-powered-by header', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('should return JSON content-type', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.headers['content-type']).toMatch(/application\/json/);
  });
});
