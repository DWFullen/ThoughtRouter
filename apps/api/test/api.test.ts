import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';

const app = buildApp();

beforeAll(async () => {
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

describe('capture flow', () => {
  it('captures and returns multiple candidates', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/capture',
      payload: {
        userId: 'u1',
        channel: 'web',
        rawText: 'call electric utility tomorrow and buy shower curtain',
        timezone: 'UTC'
      }
    });

    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.candidates.length).toBeGreaterThan(1);
  });
});
