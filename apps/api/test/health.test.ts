import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { app } from '../src/app';

describe('Health and System Endpoints', () => {
  it('GET /health should return standard API response envelope', async () => {
    const res = await request(app).get('/health');
    // Status will be 200 if connected or 503 if disconnected during unit test
    expect([200, 503]).toContain(res.status);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body).toHaveProperty('data');
    expect(res.body.data).toHaveProperty('status');
    expect(res.body.data).toHaveProperty('uptimeSeconds');
    expect(res.body.data).toHaveProperty('database');
    expect(res.body.meta).toHaveProperty('timestamp');
  });

  it('GET /api/v1/health should return health payload', async () => {
    const res = await request(app).get('/api/v1/health');
    expect([200, 503]).toContain(res.status);
    expect(res.body.success).toBe(true);
    expect(res.body.data.nodeVersion).toBeDefined();
  });

  it('GET /non-existent-route should return structured 404 NOT_FOUND error envelope', async () => {
    const res = await request(app).get('/non-existent-route');
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.data).toBeNull();
    expect(res.body.error).toBeDefined();
    expect(res.body.error.code).toBe('NOT_FOUND');
    expect(res.body.error.message).toContain('Route not found');
    expect(res.body.meta).toHaveProperty('timestamp');
  });
});
