import { beforeEach, describe, expect, it } from 'vitest';
import { rateLimitMessage, resetRateLimit, takeAttempt } from '../clientRateLimit';

describe('takeAttempt', () => {
  beforeEach(() => resetRateLimit('signIn'));

  it('allows attempts up to the limit, then asks the caller to wait', () => {
    const rule = { max: 2, windowMs: 60_000 };
    expect(takeAttempt('signIn', 1_000, rule)).toBe(0);
    expect(takeAttempt('signIn', 2_000, rule)).toBe(0);
    expect(takeAttempt('signIn', 3_000, rule)).toBe(58);
  });

  it('frees attempts once the window has passed', () => {
    const rule = { max: 1, windowMs: 10_000 };
    expect(takeAttempt('signIn', 0, rule)).toBe(0);
    expect(takeAttempt('signIn', 5_000, rule)).toBeGreaterThan(0);
    expect(takeAttempt('signIn', 10_001, rule)).toBe(0);
  });

  it('formats the wait in seconds or minutes', () => {
    expect(rateLimitMessage(30)).toContain('30 seconds');
    expect(rateLimitMessage(600)).toContain('10 minutes');
  });
});
